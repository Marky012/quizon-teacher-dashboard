/* ===========================================================================
   THE PAYLOAD, AS THE TEACHER SEES IT.

   This is the mirror of the student app's src/sync/types.ts. The two apps
   live in different repositories on purpose, so this file is a copy rather
   than a shared package, and the copy is checked against the student app
   whenever the schema version moves.

   WHY A COPY AND NOT A SHARED LIBRARY. A shared package would need its own
   release process, its own version resolution, and a build step in a repo
   that is currently a two-file school project. The contract between them is
   one JSON document with a version number in it, and the version number is
   the thing that catches a drift. A copy that says so out loud is cheaper
   and less fragile than a package that has to be kept in step.

   THE VERSION IS THE CONTRACT. `schemaVersion` is checked on arrival. A
   payload the server does not understand is refused, not half-read.
   =========================================================================== */

export const SYNC_SCHEMA_VERSION = 2

export interface SyncSkill {
  id: string
  lessonComplete: boolean
  pupEarned: boolean
  pupUses: number
  bestPreTestScore: number
}

export interface SyncTierFlag {
  needsAttention: boolean
  hintUsed: boolean
  storyId: string | null
}

export type PerformanceBand =
  | 'not_assessed'
  | 'needs_attention'
  | 'excellent'
  | 'good'
  | 'needs_improvement'

export interface StudentReport {
  learnerCode: string
  generatedAt: number
  overallPerformance: PerformanceBand
  averageScore: number
  totalAttempts: number
  completedLevels: number
  skills: {
    id: string
    name: string
    pup: string
    completed: boolean
    pupEarned: boolean
    missedCount: number
  }[]
  tiers: Record<
    string,
    {
      id: string
      attempts: number
      scores: number[]
      averageScore: number
      bestScore: number
      passed: boolean
      missedSkills: string[]
    }
  >
  skillsToFocus: string[]
  recommendations: string[]
  totals: { correct: number; incorrect: number }
}

export interface SyncPayload {
  app: string
  schemaVersion: number
  classCode: string
  learnerCode: string
  /**
   * THE OFFICIAL NAME, and the only human identifier in the payload.
   *
   * Added in schema version 2. The in-game NICKNAME is deliberately absent
   * and must stay absent: a nickname is a child's joke, not a legal name,
   * and this dashboard is a record of real children.
   *
   * Empty on a record written by a build from before version 2, so every
   * read of it has to cope with the empty string.
   */
  fullName: string
  deviceId: string
  sentAt: number
  skills: SyncSkill[]
  tierFlags: Record<string, SyncTierFlag>
  totals: { correct: number; incorrect: number }
  skillMissedCount: Record<string, number>
  missedQuestionIds: string[]
  report: StudentReport
}

/** A row in the students table, as the dashboard reads it. */
export interface StudentRow {
  id: string
  class_id: string
  learner_code: string
  /**
   * The official name, mirrored into its own column so the roster can sort
   * and search by it. It is also inside `payload.fullName` - the column is
   * the copy that a query can use without reaching into JSON.
   */
  full_name: string | null
  device_id: string
  payload: SyncPayload
  last_seen_at: string
  created_at: string
}

/** A row in the classes table. */
export interface ClassRow {
  id: string
  teacher_id: string
  name: string
  section: string | null
  code: string
  created_at: string
}
