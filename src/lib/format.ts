import type { PerformanceBand } from '../types'

/* ===========================================================================
   FORMATTING FOR A TEACHER.

   Short, plain, and unambiguous. "3 of 8 skills" is a fact. "Needs
   attention" is a flag that means something. Never a colour alone: the
   dashboard is read on a cheap projector, and every colour is paired with a
   word, the same rule the learner app follows.
   =========================================================================== */

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'never'
  const seconds = Math.max(0, Math.round((now - t) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} d ago`
  return formatDateTime(iso)
}

export const BAND_LABEL: Record<PerformanceBand, string> = {
  not_assessed: 'Not assessed yet',
  needs_attention: 'Needs attention',
  excellent: 'Excellent',
  good: 'Good',
  needs_improvement: 'Needs improvement',
}

export function percent(n: number): string {
  return `${Math.round(n)}%`
}

export function countLabel(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`
}
