/* ===========================================================================
   THE EIGHT SKILLS.

   The learner app's manifest is the source of truth for this, and the
   teacher app keeps a copy because it is a separate repository. The copy is
   display-only: the numbers always come from the synced payload, and a
   skill that appears in a payload but not in this list is still counted in
   the totals. Renaming a skill in the manifest means renaming it here too,
   and nothing else changes.

   THE ORDER IS THE TEACHING ORDER, which is also the order the skills are
   learned in Woof School.
   =========================================================================== */

export interface SkillInfo {
  id: string
  name: string
  pup: string
}

export const SKILLS: SkillInfo[] = [
  { id: 'text-type', name: 'Text Type', pup: 'Tala' },
  { id: 'purpose', name: 'Purpose', pup: 'Pipoy' },
  { id: 'main-topic', name: 'Main Topic', pup: 'Max' },
  { id: 'key-details', name: 'Key Details', pup: 'Kobe' },
  { id: 'sequence', name: 'Sequence', pup: 'Scarlett' },
  { id: 'wh-questions', name: 'Wh-Questions', pup: 'Waffle' },
  { id: 'fact-opinion', name: 'Fact or Opinion', pup: 'Franky' },
  { id: 'characters', name: 'Characters', pup: 'Coco' },
]
