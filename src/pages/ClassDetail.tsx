import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatClassCode } from '../lib/classCode'
import { BAND_LABEL, countLabel, timeAgo } from '../lib/format'
import { SKILLS } from '../lib/skills'
import type { ClassRow, StudentRow, SyncPayload } from '../types'

/* ===========================================================================
   THE ROSTER.

   THE SCREEN A TEACHER ACTUALLY USES, AND THE ORDER OF WHAT IS ON IT.

     1. THE FLAGS FIRST. "Three learners need attention" is the sentence
        that decides what happens in the next five minutes, so it is the
        first thing on the page and not buried in a table.
     2. THE SKILL PICTURE. One row per reading skill, showing how many
        learners have learned it, how many have earned the helper, and how
        many items across the class are waiting for review. A single class
        average tells a teacher nothing they can act on; this tells them
        which skill to reteach.
     3. THE ROSTER. One row per learner, with the facts that matter, and a
        link into the detail.

   THE ROWS ARE NOT SORTED BY SCORE. They are sorted by the flag, so the
   learner who needs help is the first row, not the twentieth. A teacher
   opening this during a lesson has about fifteen seconds.
   =========================================================================== */

interface StudentSummary {
  row: StudentRow
  payload: SyncPayload
  needsAttention: boolean
  helpersEarned: number
  lessonsLearned: number
  reviewItems: number
  levelsPassed: number
}

export function ClassDetail() {
  const { classId = '' } = useParams()
  const [cls, setCls] = useState<ClassRow | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [classRes, studentsRes] = await Promise.all([
      supabase.from('classes').select('*').eq('id', classId).maybeSingle(),
      supabase.from('students').select('*').eq('class_id', classId).order('last_seen_at', { ascending: false }),
    ])
    if (classRes.error) setError(classRes.error.message)
    else setCls(classRes.data as ClassRow | null)
    if (studentsRes.error) setError(studentsRes.error.message)
    else setStudents((studentsRes.data ?? []) as StudentRow[])
    setLoading(false)
  }, [classId])

  useEffect(() => {
    void load()
  }, [load])

  const summaries = useMemo<StudentSummary[]>(() => {
    return students
      .map((row) => {
        const payload = row.payload
        const report = payload?.report
        const needsAttention = Object.values(payload?.tierFlags ?? {}).some((f) => f.needsAttention)
        return {
          row,
          payload,
          needsAttention,
          helpersEarned: (payload?.skills ?? []).filter((s) => s.pupEarned).length,
          lessonsLearned: (payload?.skills ?? []).filter((s) => s.lessonComplete).length,
          reviewItems: Object.values(payload?.skillMissedCount ?? {}).reduce((a, b) => a + b, 0),
          levelsPassed: report?.completedLevels ?? 0,
        }
      })
      .sort((a, b) => {
        if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1
        /* BY NAME, because that is how a teacher reads a roster - and the
           name is the headline the column shows. Rows with no name yet (a
           device that has not reached the Profile screen) sort by their
           learner code, which is the same fallback the column uses. */
        const an = a.row.full_name || a.payload.fullName || a.row.learner_code
        const bn = b.row.full_name || b.payload.fullName || b.row.learner_code
        return an.localeCompare(bn)
      })
  }, [students])

  const flagged = summaries.filter((s) => s.needsAttention)

  /** Per-skill class picture. */
  const skillRows = useMemo(() => {
    return SKILLS.map((skill) => {
      let learned = 0
      let earned = 0
      let review = 0
      let scored = 0
      let scoreSum = 0
      for (const s of summaries) {
        const p = s.payload.skills?.find((k) => k.id === skill.id)
        if (!p) continue
        if (p.lessonComplete) learned += 1
        if (p.pupEarned) earned += 1
        review += s.payload.skillMissedCount?.[skill.name] ?? 0
        if (p.bestPreTestScore > 0) {
          scored += 1
          scoreSum += p.bestPreTestScore
        }
      }
      return {
        skill,
        learned,
        earned,
        review,
        average: scored > 0 ? Math.round(scoreSum / scored) : null,
        total: summaries.length,
      }
    })
  }, [summaries])

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-8 text-navy/70">Loading…</main>

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p role="alert" className="rounded-[12px] bg-coral-soft px-4 py-3 text-indigo">
          {error}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/classes" className="text-sm text-navy/70 underline">
            All classes
          </Link>
          <h1 className="font-display text-3xl text-indigo">{cls?.name ?? 'Class'}</h1>
          {cls?.section && <p className="text-navy/70">Section {cls.section}</p>}
          <p className="mt-2 text-navy/80">
            Class code{' '}
            <code className="rounded-[10px] bg-indigo px-2 py-1 font-display text-xl tracking-wider text-cream">
              {formatClassCode(cls?.code ?? '')}
            </code>
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-[12px] border-2 border-navy/15 px-4 py-2 text-sm text-navy/80"
        >
          Print this report
        </button>
      </header>

      {/* 1. THE FLAGS. First, because they decide what happens next. */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[16px] bg-indigo p-4 text-cream print-plain">
          <p className="font-display text-3xl tabular-nums">{summaries.length}</p>
          <p className="text-sm text-cream/85">learners synced</p>
        </div>
        <div className="rounded-[16px] bg-white p-4">
          <p className="font-display text-3xl tabular-nums text-indigo">{flagged.length}</p>
          <p className="text-sm text-navy/70">need attention</p>
        </div>
        <div className="rounded-[16px] bg-white p-4">
          <p className="font-display text-3xl tabular-nums text-indigo">
            {summaries.length > 0
              ? Math.round(
                  summaries.reduce((a, s) => a + (s.payload.report?.averageScore ?? 0), 0) / summaries.length,
                )
              : 0}
            %
          </p>
          <p className="text-sm text-navy/70">class average</p>
        </div>
      </section>

      {flagged.length > 0 && (
        <section className="mt-4 rounded-[16px] border-2 border-coral/40 bg-coral-soft p-4">
          <h2 className="font-display text-lg text-indigo">Sit down with these learners</h2>
          <p className="mt-1 text-sm text-navy/80">
            They used all three attempts on a level without reaching 70%.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {flagged.map((s) => (
              <li key={s.row.id}>
                <Link
                  to={`/students/${s.row.id}`}
                  className="rounded-[10px] bg-white px-3 py-1 font-bold text-indigo"
                >
                  {s.row.learner_code}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 2. THE SKILL PICTURE. */}
      <section className="mt-8">
        <h2 className="font-display text-xl text-indigo">By reading skill</h2>
        <p className="mt-1 text-sm text-navy/70">
          How the class is doing on each of the eight skills, in teaching order.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-navy/20">
                <th scope="col" className="py-2 pr-3 font-bold text-navy">
                  Skill
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-bold text-navy">
                  Lesson learned
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-bold text-navy">
                  Helper earned
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-bold text-navy">
                  Check average
                </th>
                <th scope="col" className="py-2 text-right font-bold text-navy">
                  To review
                </th>
              </tr>
            </thead>
            <tbody>
              {skillRows.map((row) => (
                <tr key={row.skill.id} className="border-b border-navy/10">
                  <th scope="row" className="py-2 pr-3 font-bold text-indigo">
                    {row.skill.name}
                    <span className="ml-2 text-xs font-normal text-navy/60">{row.skill.pup}</span>
                  </th>
                  <td className="py-2 pr-3 text-right tabular-nums text-navy">
                    {row.total === 0 ? '—' : `${row.learned} / ${row.total}`}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-navy">
                    {row.total === 0 ? '—' : `${row.earned} / ${row.total}`}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-navy">
                    {row.average === null ? '—' : `${row.average}%`}
                  </td>
                  <td
                    className={`py-2 text-right font-bold tabular-nums ${
                      row.review > 0 ? 'text-coral' : 'text-navy/40'
                    }`}
                  >
                    {row.review > 0 ? row.review : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. THE ROSTER. */}
      <section className="mt-8">
        <h2 className="font-display text-xl text-indigo">Learners</h2>
        {summaries.length === 0 ? (
          <p className="mt-3 rounded-[14px] border-2 border-dashed border-navy/20 px-4 py-8 text-center text-navy/70">
            Nothing yet. Give the class code to your learners; the first one to come online shows
            up here.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-navy/20">
                    <th scope="col" className="py-2 pr-3 font-bold text-navy">
                      Learner
                    </th>
                  <th scope="col" className="py-2 pr-3 font-bold text-navy">
                    Status
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-bold text-navy">
                    Average
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-bold text-navy">
                    Levels
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-bold text-navy">
                    Helpers
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-bold text-navy">
                    To review
                  </th>
                  <th scope="col" className="py-2 text-right font-bold text-navy">
                    Last seen
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.row.id} className="border-b border-navy/10">
                    <th scope="row" className="py-2 pr-3">
                      {/* THE NAME IS THE HEADLINE, and the code is the second
                          line under it. That order is the whole point of the
                          column: a teacher scanning a roster is looking for
                          "Maria Santos Reyes", and the code is the fallback
                          for a row that has no name yet - a device that has
                          not reached the Profile screen, or a record written
                          before the full name existed.

                          The name comes from the COLUMN, not from the JSON
                          payload, because the column is the one a query can
                          sort on. The payload is still the source of truth
                          for a record written before the column was added. */}
                      <Link to={`/students/${s.row.id}`} className="font-bold text-indigo underline">
                        {s.row.full_name || s.payload.fullName || s.row.learner_code}
                        {s.row.full_name || s.payload.fullName ? (
                          <span className="block text-xs font-normal text-navy/70">
                            {s.row.learner_code}
                          </span>
                        ) : null}
                      </Link>
                    </th>
                    <td className="py-2 pr-3">
                      {s.needsAttention ? (
                        <span className="rounded-pill bg-coral-soft px-2 py-1 text-xs font-bold text-indigo">
                          Needs attention
                        </span>
                      ) : (
                        <span className="text-navy/80">
                          {BAND_LABEL[s.payload.report?.overallPerformance ?? 'not_assessed']}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-navy">
                      {s.payload.report?.averageScore ?? 0}%
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-navy">
                      {s.levelsPassed} / 3
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-navy">
                      {s.helpersEarned} / 8
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-bold tabular-nums ${
                        s.reviewItems > 0 ? 'text-coral' : 'text-navy/40'
                      }`}
                    >
                      {s.reviewItems > 0 ? s.reviewItems : '—'}
                    </td>
                    <td className="py-2 text-right text-navy/70">{timeAgo(s.row.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-8 text-xs text-navy/60">
        {countLabel(summaries.length, 'learner')} with a synced record. A learner appears here the
        first time their device reaches the server.
      </p>
    </main>
  )
}
