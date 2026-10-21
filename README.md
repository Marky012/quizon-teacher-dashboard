# QuizOn! Teacher Dashboard

The teacher's side of [QuizOn!](https://github.com/Marky012/quizon) — the
gamified reading app for Grade 5 learners in Barangay Quezon, Tagbina.

A learner's record used to travel on a file that a child had to save and
hand over. It does not any more. The learner types a class code once, the
device sends the record by itself whenever it can reach a network, and the
teacher opens a dashboard and sees the class.

**This is a separate repository from the student app, on purpose.** See
[DEPLOY.md](DEPLOY.md#why-the-dashboard-is-a-separate-repository) for the four
reasons.

---

## What the teacher gets

- **A roster**, one row per learner, with the facts that decide what happens
  in the next five minutes: average score, levels passed, helpers earned,
  items to review, and the last time the device was online.
- **A flags-first layout.** Learners who used all three attempts without
  reaching 70% are at the top of the roster, not at the bottom. A teacher
  opening this during a lesson has about fifteen seconds.
- **A per-skill class picture.** One row per reading skill, showing how many
  learners learned it, how many earned the helper, and how many items across
  the class are waiting for review. A single class average tells a teacher
  nothing they can act on.
- **A per-learner detail**: every skill, every level, the passage each
  learner is sitting in, and the recommendations the learner app itself
  wrote.
- **A printable report.** Print styles strip the chrome and force black on
  white, so the class report survives a greyscale photocopy.

## What the teacher never sees

A name. There is no name in the data, on purpose. The learner code is the
only identifier that travels, and the teacher matches it to the child because
the teacher wrote the code on the board.

---

## Setup

The full walkthrough, including the free Supabase project, the database
schema, the edge function and the deploy steps, is in
**[DEPLOY.md](DEPLOY.md)**.

The short version:

```bash
npm install
cp .env.example .env      # fill in your Supabase URL and anon key
npm run dev               # http://localhost:5173
```

## The stack

| Piece | What it is |
|---|---|
| **React 19 + TypeScript + Vite** | the app |
| **Tailwind CSS v4** | styling, on the same colour tokens as the learner app |
| **Supabase** | Postgres, email/password auth, and Row Level Security |
| **Supabase Edge Function** | the endpoint a learner device POSTs its record to |

Everything runs on a free tier. No credit card, no cost.

## The layout

```
quizon-teacher/
├── src/
│   ├── pages/
│   │   ├── Login.tsx          # sign in, or create the teacher's account
│   │   ├── Classes.tsx        # the teacher's classes, and the codes
│   │   ├── ClassDetail.tsx    # the roster and the per-skill class picture
│   │   └── StudentDetail.tsx  # one learner, in full
│   ├── lib/
│   │   ├── supabase.ts        # the client, and the note on why the anon key is public
│   │   ├── classCode.ts       # code format, normalisation, generation
│   │   ├── format.ts          # dates, percentages, band labels
│   │   └── skills.ts          # the eight skills (display only)
│   └── types.ts               # the payload, mirrored from the student app
├── supabase/
│   ├── schema.sql             # the two tables and the RLS policies
│   └── functions/sync-student/
│       └── index.ts           # the endpoint a learner device posts to
└── DEPLOY.md
```

## The security model, in one paragraph

The anon key in this app is public, and that is fine: **Row Level Security**
is what protects the data. A teacher's session can read their own classes
and the learner rows in them, and nothing else. The `students` table has no
insert or update policy at all, so the browser cannot write a learner record;
the only writer is the edge function, which holds the service-role key and
uses it for exactly one thing, checking the class code before it writes.

The class code is therefore the capability token for uploading into a class.
Someone who knows a class code can write into that class — the same way
someone who knows a Wi-Fi password can join the network. It is protected by
not being written on the door, and the teacher can create a new class if it
leaks.
