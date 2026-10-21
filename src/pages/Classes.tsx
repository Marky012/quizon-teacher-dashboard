import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatClassCode, generateClassCode } from '../lib/classCode'
import { countLabel, formatDateTime } from '../lib/format'
import type { ClassRow } from '../types'

/* ===========================================================================
   THE CLASSES.

   The teacher's home. Every class this teacher owns, and the code for each
   one, because the code is the thing they have to write on the board and
   say out loud to thirty children.

   THE CREATE FLOW DELIBERATELY MAKES THE CODE, NOT THE TEACHER. A teacher
   who names their class "Grade 5A" has named it the same as every other
   Grade 5A in the region, and two classes with the same code would put one
   class's records in the other class's dashboard. A generated code cannot
   collide, and the teacher never has to remember it because it is right
   here on the screen.
   =========================================================================== */

interface ClassWithCount extends ClassRow {
  students: { count: number }[]
}

export function Classes() {
  const [classes, setClasses] = useState<ClassWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [section, setSection] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('classes')
      .select('*, students(count)')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setClasses((data ?? []) as ClassWithCount[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [load])

  async function createClass(e: React.FormEvent) {
    e.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return
    setBusy(true)
    setError(null)

    // The class must belong to the teacher who is signed in, and the insert
    // policy is `teacher_id = auth.uid()`. So the id has to be in the row.
    //
    // It is read from the session rather than typed in, and the database
    // still checks it, so a teacher cannot create a class in someone else's
    // account even by editing the request.
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      setError('Your session has expired. Sign in again.')
      setBusy(false)
      return
    }

    // Try a few codes. The odds of a collision are tiny, but a duplicate
    // code is the one failure that would quietly mix two classes' records,
    // so the retry is not optional.
    let lastError = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateClassCode()
      const { error: err } = await supabase.from('classes').insert({
        teacher_id: userData.user.id,
        name: cleanName,
        section: section.trim() || null,
        code,
      })
      if (!err) {
        setName('')
        setSection('')
        setBusy(false)
        await load()
        return
      }
      lastError = err.message
      // 23505 is a unique violation. Anything else is a real problem and
      // repeating will not fix it.
      if (!err.message.includes('duplicate') && !err.message.includes('23505')) break
    }
    setError(lastError || 'Could not create the class.')
    setBusy(false)
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(formatClassCode(code))
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Clipboard blocked. The code is on screen; the teacher can read it out.
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="no-print flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-indigo">My classes</h1>
          <p className="mt-1 text-navy/70">
            Each class has a code. Write it on the board, and the learners type it into QuizOn!
            once.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="rounded-[12px] border-2 border-navy/15 px-3 py-2 text-sm text-navy/80"
        >
          Sign out{email ? ` (${email})` : ''}
        </button>
      </header>

      {error && (
        <p role="alert" className="mt-4 rounded-[12px] bg-coral-soft px-4 py-3 text-sm text-indigo">
          {error}
        </p>
      )}

      <section className="mt-6 no-print">
        <h2 className="font-display text-xl text-indigo">New class</h2>
        <form onSubmit={createClass} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-bold text-navy">
            Class name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Grade 5 - Section A"
              maxLength={60}
              className="mt-1 w-full rounded-[12px] border-2 border-navy/15 bg-white px-4 py-3 font-normal text-indigo focus:outline-3 focus:outline-[var(--color-focus)]"
            />
          </label>
          <label className="w-full text-sm font-bold text-navy sm:w-48">
            Section (optional)
            <input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="A"
              maxLength={20}
              className="mt-1 w-full rounded-[12px] border-2 border-navy/15 bg-white px-4 py-3 font-normal text-indigo focus:outline-3 focus:outline-[var(--color-focus)]"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-[14px] bg-turquoise px-5 py-3 font-display text-lg text-on-turquoise disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create class'}
          </button>
        </form>
      </section>

      <section className="mt-8">
        {loading ? (
          <p className="text-navy/70">Loading…</p>
        ) : classes.length === 0 ? (
          <p className="rounded-[14px] border-2 border-dashed border-navy/20 px-4 py-8 text-center text-navy/70">
            No classes yet. Create one above and you will get a code to give your learners.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {classes.map((c) => (
              <li key={c.id} className="rounded-[18px] border-2 border-navy/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg leading-6 text-indigo">{c.name}</h3>
                    {c.section && <p className="text-sm text-navy/70">Section {c.section}</p>}
                  </div>
                  <span className="rounded-pill bg-turquoise-soft px-3 py-1 text-xs font-bold text-indigo">
                    {countLabel(c.students?.[0]?.count ?? 0, 'learner')}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <code className="rounded-[10px] bg-indigo px-3 py-2 font-display text-2xl tracking-wider text-cream">
                    {formatClassCode(c.code)}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyCode(c.code)}
                    className="rounded-[10px] border-2 border-navy/15 px-3 py-2 text-sm text-navy/80"
                  >
                    {copied === c.code ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <p className="mt-2 text-sm text-navy/70">
                  Created {formatDateTime(c.created_at)}
                </p>

                <Link
                  to={`/classes/${c.id}`}
                  className="mt-3 inline-block rounded-[12px] bg-turquoise px-4 py-2 font-bold text-on-turquoise"
                >
                  Open roster
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
