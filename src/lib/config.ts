/* ===========================================================================
   THE CONFIGURATION.

   THE PUBLISHABLE KEY IS PUBLIC, AND THAT IS BY DESIGN. Supabase calls it
   the "publishable" key precisely because it is meant to ship in a browser
   bundle. It identifies the project; it does not grant access. What grants
   access is Row Level Security, and RLS is a database rule that no amount of
   poking at the bundle can get around.

   THE SECRET KEY IS NOT HERE. The `sb_secret_...` key bypasses RLS and
   belongs to exactly one place: the sync edge function, as a server-side
   secret. It must never be in this repository, in this bundle, in a
   .env file that gets committed, or in a screenshot.

   WHY THERE IS A BUILT-IN DEFAULT. The Netlify site works the moment the
   repository is connected, with no environment variables to set and nothing
   to go wrong. Set VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in the host
   and they win; leave them out and the defaults below are used. Both point
   at this project's own Supabase instance.
   =========================================================================== */

/** The public Supabase project URL. */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://qovrlursadsjkdyowqwc.supabase.co'

/**
 * The publishable key. Read-only access to this teacher's own classes, and
 * nothing else.
 */
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'sb_publishable_gxZEE8UJtRsUu1Jy52d6sw_DYPZUE6x'

/**
 * The endpoint a learner device POSTs its record to.
 *
 * It is here so the dashboard and the student app agree on where the server
 * is without anyone having to copy a URL between two dashboards.
 */
export const SYNC_ENDPOINT =
  import.meta.env.VITE_SYNC_ENDPOINT ??
  'https://qovrlursadsjkdyowqwc.supabase.co/functions/v1/sync-student'
