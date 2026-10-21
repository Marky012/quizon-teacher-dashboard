import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Routes, Route, Navigate } from 'react-router-dom'
import { configured, supabase } from './lib/supabase'
import { Login } from './pages/Login'
import { Classes } from './pages/Classes'
import { ClassDetail } from './pages/ClassDetail'
import { StudentDetail } from './pages/StudentDetail'

/* ===========================================================================
   THE TEACHER DASHBOARD.

   FOUR SCREENS, IN THIS ORDER.

     1. LOGIN. The teacher signs in with the email and password they set up
        once. Nothing else is public.
     2. CLASSES. The list of classes this teacher owns, and the button that
        makes a new one. Every class shows its code, because the code is
        the thing the teacher has to say out loud.
     3. A CLASS. The roster. One row per learner, with the facts a teacher
        acts on: what they have mastered, what they are missing, and who
        needs a sit-down.
     4. A LEARNER. The detail behind one row: every skill, every level, and
        the recommendations the app itself wrote.

   WHY A CLASS CODE AND NOT A LOGIN FOR THE STUDENTS. A Grade 5 child
   cannot type an email address, and an app that asks for one is an app
   that a child will fail to use. The class code is the one thing a child
   can copy off a board, and it is short enough for that.
   =========================================================================== */

function NotConfigured() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-3xl text-indigo">QuizOn! Teacher Dashboard</h1>
      <p className="mt-4 leading-7 text-navy/80">
        This build is not connected to a server yet. Copy{' '}
        <code className="rounded bg-indigo-soft/60 px-1">.env.example</code> to{' '}
        <code className="rounded bg-indigo-soft/60 px-1">.env</code> and fill in your Supabase
        project URL and anon key.
      </p>
      <p className="mt-3 leading-7 text-navy/80">
        The full setup, including the database schema and the sync endpoint, is in{' '}
        <code className="rounded bg-indigo-soft/60 px-1">DEPLOY.md</code>.
      </p>
    </main>
  )
}

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!configured) return <NotConfigured />

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-navy/70">Loading…</main>
    )
  }

  if (!session) return <Login />

  return (
    <Routes>
      <Route path="/" element={<Classes />} />
      <Route path="/classes" element={<Classes />} />
      <Route path="/classes/:classId" element={<ClassDetail />} />
      <Route path="/students/:studentId" element={<StudentDetail />} />
      <Route path="*" element={<Navigate to="/classes" replace />} />
    </Routes>
  )
}
