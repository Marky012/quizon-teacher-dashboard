/* ===========================================================================
   CLASS CODES.

   A class code is the capability token for uploading into a class. The
   teacher reads it out, the learner types it, and the server checks it.

   THE FORMAT. Two letters and four digits: QZ4821, written on a board as
   "QZ-4821". Two letters and four digits is 26*26*10*10*10*10 = 6.7 million
   possibilities, which is far more than a school needs and far more than a
   child can guess by accident.

   WHY THE CODE IS GENERATED AND NOT CHOSEN. A teacher who picks "Grade 5A"
   has picked something every other class in the region also picked. A
   generated code is unique, and the teacher never has to remember which
   one they gave to which class: it is on the class list, in the app, and
   it can be copied out with one click.
   =========================================================================== */

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I and no O: they read as 1 and 0
const DIGITS = '0123456789'

export const CLASS_CODE_LENGTH = 6

export function normalizeClassCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CLASS_CODE_LENGTH)
}

export function formatClassCode(code: string): string {
  const clean = normalizeClassCode(code)
  if (clean.length <= 2) return clean
  return `${clean.slice(0, 2)}-${clean.slice(2)}`
}

export function generateClassCode(random: () => number = Math.random): string {
  let out = ''
  for (let i = 0; i < 2; i++) out += LETTERS[Math.floor(random() * LETTERS.length)]
  for (let i = 0; i < 4; i++) out += DIGITS[Math.floor(random() * DIGITS.length)]
  return out
}
