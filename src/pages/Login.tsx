import { useState } from 'react'
import { supabase } from '../lib/supabase'

/* ===========================================================================
   LOGIN.

   A teacher needs an account before anything else works, so the screen does
   both: sign in for an account that exists, or create one.

   WHY THE SIGN-UP IS HERE AT ALL. Supabase can be told to require a
   confirmed email before an account works. For a school prototype that is
   one extra click in the Supabase dashboard and it removes a support
   problem ("I created it but it says invalid login"). DEPLOY.md says which
   setting to turn off.
   =========================================================================== */

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'in') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
      } else {
        const { error: err, data } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (!data.session) {
          setNotice('Account created. Check your email to confirm it, then sign in.')
          setMode('in')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <h1 className="font-display text-3xl text-indigo">QuizOn! Teacher Dashboard</h1>
      <p className="mt-2 leading-6 text-navy/80">
        See how every learner in your class is doing, as soon as their device is online.
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
        <label className="text-sm font-bold text-navy" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-[12px] border-2 border-navy/15 bg-white px-4 py-3 text-indigo focus:outline-3 focus:outline-[var(--color-focus)]"
        />

        <label className="text-sm font-bold text-navy" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-[12px] border-2 border-navy/15 bg-white px-4 py-3 text-indigo focus:outline-3 focus:outline-[var(--color-focus)]"
        />

        {error && (
          <p role="alert" className="rounded-[12px] bg-coral-soft px-4 py-3 text-sm text-indigo">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-[12px] bg-lime-soft px-4 py-3 text-sm text-indigo">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-[14px] bg-turquoise px-4 py-3 font-display text-lg text-on-turquoise disabled:opacity-50"
        >
          {busy ? 'Working…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'in' ? 'up' : 'in')
          setError(null)
          setNotice(null)
        }}
        className="mt-4 self-start text-sm text-navy/70 underline"
      >
        {mode === 'in' ? 'I need an account' : 'I already have an account'}
      </button>
    </main>
  )
}
