// ===========================================================================
// THE SYNC ENDPOINT.
//
// A learner device POSTs its record here. The function checks the class
// code, finds the class, and writes one row.
//
// WHY A FUNCTION AND NOT A DIRECT TABLE WRITE. The browser holds the anon
// key, and the anon key is not allowed to write student rows: the students
// table has no insert policy, so a direct write from the browser is refused
// by the database no matter what the client sends. This function holds the
// SERVICE-ROLE key, which bypasses RLS, and it uses that power for exactly
// one thing: checking the class code before it writes.
//
// SO THE CLASS CODE IS THE CAPABILITY TOKEN. Someone who knows a class code
// can write into that class. That is the design, not an accident: a Grade 5
// child cannot hold a secret they cannot type, so the class code is the
// secret, and it is short enough to say out loud in a classroom. It is
// protected the way a Wi-Fi password is protected, by not being written on
// the door. The teacher changes it by creating a new class if it leaks.
//
// DEPLOY WITH:
//   supabase functions deploy sync-student --no-verify-jwt
//
// The --no-verify-jwt flag is required. A learner device has no Supabase
// session, so there is no JWT to verify; the function authenticates with
// the service-role key instead. Without the flag, every sync is rejected
// with a 401 and nothing ever arrives.
// ===========================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

/** The payload version this function understands. */
const SUPPORTED_SCHEMA_VERSION = 1

/** Two letters and four digits. */
const CLASS_CODE_LENGTH = 6

/** A generous ceiling. The real payload is about 4 KB. */
const MAX_BODY_BYTES = 256 * 1024

/**
 * THE ADMIN KEY, AND WHY IT IS READ THIS WAY.
 *
 * Supabase injects the privileged key into every function, but it moved:
 *
 *   SUPABASE_SECRET_KEYS       a JSON dictionary of the NEW style keys,
 *                             keyed by name. This is what a project created
 *                             with the new key format gets, and it is the
 *                             one to use.
 *   SUPABASE_SERVICE_ROLE_KEY  the LEGACY service_role JWT. Still injected,
 *                             but a new-style project may have none.
 *
 * So: try the new one first, fall back to the legacy one, and fail loudly
 * with a readable message if neither is there. A function that silently
 * wrote with no key would look like it was working while storing nothing.
 */
function adminKey(): string {
  const dict = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (dict) {
    try {
      const parsed = JSON.parse(dict) as Record<string, unknown>
      for (const value of Object.values(parsed)) {
        if (typeof value === 'string' && value.length > 0) return value
      }
    } catch {
      // Not JSON. Fall through to the legacy key.
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function normalizeClassCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CLASS_CODE_LENGTH)
}

Deno.serve(async (req) => {
  // The browser sends a preflight before a cross-origin JSON POST. Without
  // this the real request never leaves the device.
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Use POST.' })

  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'That record is too large.' })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw)
  } catch {
    return json(400, { ok: false, error: 'That was not a valid record.' })
  }

  const classCode = normalizeClassCode(String(body.classCode ?? ''))
  const learnerCode = String(body.learnerCode ?? '').trim().toUpperCase().slice(0, 12)
  const deviceId = String(body.deviceId ?? '').trim().slice(0, 64)
  const schemaVersion = Number(body.schemaVersion ?? 0)

  if (classCode.length !== CLASS_CODE_LENGTH) {
    return json(400, { ok: false, error: 'That class code is not the right length.' })
  }
  if (!learnerCode || !deviceId) {
    return json(400, { ok: false, error: 'The record is missing a learner code or a device id.' })
  }
  if (schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    // A newer app talking to an older server. Refuse rather than half-read:
    // a record stored with the wrong shape is worse than no record.
    return json(400, { ok: false, error: 'This app version is newer than the server.' })
  }

  const key = adminKey()
  if (!key) {
    return json(500, { ok: false, error: 'The server has no admin key configured.' })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: cls, error: classError } = await supabase
    .from('classes')
    .select('id')
    .eq('code', classCode)
    .maybeSingle()

  if (classError) {
    return json(500, { ok: false, error: 'The server could not look up that class.' })
  }
  if (!cls) {
    // The same answer for "no such class" and "this code belongs to another
    // school". A wrong code should not tell a stranger that a code exists.
    return json(400, { ok: false, error: 'That class code is not one of ours.' })
  }

  const { data, error: writeError } = await supabase
    .from('students')
    .upsert(
      {
        class_id: cls.id,
        learner_code: learnerCode,
        device_id: deviceId,
        payload: body,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'class_id,learner_code,device_id' },
    )
    .select('id')
    .single()

  if (writeError) {
    return json(500, { ok: false, error: 'The record could not be saved.' })
  }

  return json(200, { ok: true, rowId: data.id })
})
