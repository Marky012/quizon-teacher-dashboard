import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BAND_LABEL, formatDateTime, percent, timeAgo } from '../lib/format'
import { SKILLS } from '../lib/skills'
import type { StudentRow } from '../types'

/* ===========================================================================
   ONE LEARNER.

   Everything the roster row pointed at, in full: every skill, every level,
   and the recommendations the learner app itself wrote. The app's own
   words are quoted rather than paraphrased, because the recommendations
   were written for a teacher to read.

   THE LEARNER IS NOT NAMED. There is no name in the data, on purpose. The
   teacher knows the code because the teacher put the code on the board, and
   can match it to the child sitting in front of them. The dashboard does
   not hold a name it does not need.
   =========================================================================== */

const TIER_NAMES: Record<string, string> = {
  easy: 'Garden of Words',
  medium: 'Canteen of Riddles',
  hard: 'Throne of Answers',
}

export function StudentDetail() {
  const { studentId = '' } = useParams()
  const [row, setRow] = useState<StudentRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle()
    if (err) setError(err.message)
    else setRow((data as StudentRow | null) ?? null)
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-8 text-navy/70">Loading…</main>

  if (error || !row) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p role="alert" className="rounded-[12px] bg-coral-soft px-4 py-3 text-indigo">
          {error ?? 'That learner record was not found.'}
        </p>
      </main>
    )
  }

  const payload = row.payload
  const report = payload.report
  const totals = payload.totals ?? { correct: 0, incorrect: 0 }
  const answered = totals.correct + totals.incorrect

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="no-print">
        <Link to={`/classes/${row.class_id}`} className="text-sm text-navy/70 underline">
          Back to the roster
        </Link>
        {/* THE NAME IS THE HEADLINE. Before 2026-10-22 this read "Learner
            BAL-47" and nothing else, because the app sent no name at all. The
            official name now travels with the record, so the page is titled
            with the person and the code is the small second line under it -
            the machine identifier, still there, just no longer the only thing
            a teacher has to go on.

            The code is the fallback for a row with no name: a device that has
            not reached the Profile screen yet, or a record written before
            the name existed. */}
        <h1 className="font-display text-3xl text-indigo">
          {row.full_name || payload.fullName || `Learner ${row.learner_code}`}
        </h1>
        <p className="mt-1 text-navy/70">
          {row.full_name || payload.fullName ? (
            <>
              Learner code <span className="font-bold text-navy">{row.learner_code}</span> ·{' '}
            </>
          ) : null}
          Last synced {timeAgo(row.last_seen_at)} · {formatDateTime(row.last_seen_at)}
        </p>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-[16px] bg-indigo p-4 text-cream print-plain">
          <p className="font-display text-3xl tabular-nums">{report?.averageScore ?? 0}%</p>
          <p className="text-sm text-cream/85">average</p>
        </div>
        <div className="rounded-[16px] bg-white p-4">
          <p className="font-display text-2xl text-indigo">
            {BAND_LABEL[report?.overallPerformance ?? 'not_assessed']}
          </p>
          <p className="text-sm text-navy/70">overall</p>
        </div>
        <div className="rounded-[16px] bg-white p-4">
          <p className="font-display text-3xl tabular-nums text-indigo">
            {report?.completedLevels ?? 0}/3
          </p>
          <p className="text-sm text-navy/70">levels passed</p>
        </div>
        <div className="rounded-[16px] bg-white p-4">
          <p className="font-display text-3xl tabular-nums text-indigo">
            {answered > 0 ? Math.round((totals.correct / answered) * 100) : 0}%
          </p>
          <p className="text-sm text-navy/70">{totals.correct} of {answered} correct</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl text-indigo">By reading skill</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-navy/20">
                <th scope="col" className="py-2 pr-3 font-bold text-navy">Skill</th>
                <th scope="col" className="py-2 pr-3 font-bold text-navy">Lesson</th>
                <th scope="col" className="py-2 pr-3 font-bold text-navy">Helper</th>
                <th scope="col" className="py-2 pr-3 text-right font-bold text-navy">Check</th>
                <th scope="col" className="py-2 pr-3 text-right font-bold text-navy">Called</th>
                <th scope="col" className="py-2 text-right font-bold text-navy">To review</th>
              </tr>
            </thead>
            <tbody>
              {SKILLS.map((skill) => {
                const s = payload.skills?.find((k) => k.id === skill.id)
                const review = payload.skillMissedCount?.[skill.name] ?? 0
                return (
                  <tr key={skill.id} className="border-b border-navy/10">
                    <th scope="row" className="py-2 pr-3 font-bold text-indigo">
                      {skill.name}
                      <span className="ml-2 text-xs font-normal text-navy/60">{skill.pup}</span>
                    </th>
                    <td className="py-2 pr-3 text-navy">{s?.lessonComplete ? 'Learned' : '—'}</td>
                    <td className="py-2 pr-3 text-navy">{s?.pupEarned ? 'Earned' : '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-navy">
                      {s && s.bestPreTestScore > 0 ? percent(s.bestPreTestScore) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-navy">{s?.pupUses ?? 0}</td>
                    <td
                      className={`py-2 text-right font-bold tabular-nums ${
                        review > 0 ? 'text-coral' : 'text-navy/40'
                      }`}
                    >
                      {review > 0 ? review : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl text-indigo">By level</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-navy/20">
                <th scope="col" className="py-2 pr-3 font-bold text-navy">Level</th>
                <th scope="col" className="py-2 pr-3 font-bold text-navy">Passage</th>
                <th scope="col" className="py-2 pr-3 text-right font-bold text-navy">Attempts</th>
                <th scope="col" className="py-2 pr-3 text-right font-bold text-navy">Best</th>
                <th scope="col" className="py-2 pr-3 font-bold text-navy">Result</th>
                <th scope="col" className="py-2 text-right font-bold text-navy">Hint used</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report?.tiers ?? {}).map(([id, tier]) => {
                const flag = payload.tierFlags?.[id]
                return (
                  <tr key={id} className="border-b border-navy/10">
                    <th scope="row" className="py-2 pr-3 font-bold text-indigo">
                      {TIER_NAMES[id] ?? id}
                    </th>
                    <td className="py-2 pr-3 text-navy/70">{flag?.storyId ?? '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-navy">
                      {tier.attempts} of 3
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-navy">{tier.bestScore}%</td>
                    <td className="py-2 pr-3">
                      {flag?.needsAttention ? (
                        <span className="rounded-pill bg-coral-soft px-2 py-1 text-xs font-bold text-indigo">
                          Needs attention
                        </span>
                      ) : tier.passed ? (
                        <span className="rounded-pill bg-lime-soft px-2 py-1 text-xs font-bold text-indigo">
                          Passed
                        </span>
                      ) : tier.attempts > 0 ? (
                        <span className="text-navy/80">In progress</span>
                      ) : (
                        <span className="text-navy/50">Not attempted</span>
                      )}
                    </td>
                    <td className="py-2 text-right text-navy/70">{flag?.hintUsed ? 'Yes' : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl text-indigo">What the app suggests</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {(report?.recommendations ?? []).map((r) => (
            <li key={r} className="rounded-[12px] bg-white px-4 py-3 text-sm text-navy/85">
              {r}
            </li>
          ))}
        </ul>
        {report?.skillsToFocus?.length ? (
          <p className="mt-3 text-sm text-navy/80">
            Skills to focus on: <strong>{report.skillsToFocus.join(', ')}</strong>
          </p>
        ) : null}
        {payload.missedQuestionIds?.length ? (
          <p className="mt-1 text-sm text-navy/70">
            {payload.missedQuestionIds.length} distinct items were missed.
          </p>
        ) : null}
      </section>
    </main>
  )
}
