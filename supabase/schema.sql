-- ===========================================================================
-- QUIZON! TEACHER DASHBOARD - DATABASE SCHEMA
--
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New
-- query), or with `supabase db push`.
--
-- TWO TABLES. A class belongs to a teacher. A student row belongs to a
-- class and holds ONE JSON payload: the learner's whole record.
--
-- WHY THE PAYLOAD IS JSONB AND NOT COLUMNS. The learner's record has eight
-- skills, three levels, per-skill counters and a report. Putting all of that
-- in columns would mean a migration every time the learner app grows a
-- field. A jsonb column means the server stores whatever the app sends and
-- the dashboard reads the parts it understands. The one thing that DOES have
-- to be a column is what the dashboard sorts and filters on, and that is
-- what the other columns are.
--
-- THE SECURITY MODEL, IN ONE PARAGRAPH. Row Level Security does the
-- protecting. A teacher's session can see their own classes and the student
-- rows in them, and nothing else. The students table has NO insert or
-- update policy at all: the only writer is the sync edge function, which
-- runs with the service-role key and therefore bypasses RLS. The anon key
-- in the browser can try anything it likes and will be refused.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- --- the classes -----------------------------------------------------------
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  section     text,
  -- The class code. Unique across the whole project, because it is the
  -- capability token for uploading into a class.
  code        text not null unique,
  created_at  timestamptz not null default now()
);

comment on table public.classes is 'A class of learners. The code is what a learner types into QuizOn!.';

-- THE TEACHER IS THE SESSION, NOT A FIELD THE CLIENT FILLS IN.
--
-- Without this default, the dashboard has to read the signed-in user id and
-- put it in the insert. That works, and the RLS policy checks it either way,
-- but the default is one less thing to forget: with it, a class always
-- belongs to whoever is signed in, even if a future screen forgets to say so.
alter table public.classes alter column teacher_id set default auth.uid();

-- --- the student records ---------------------------------------------------
create table if not exists public.students (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.classes (id) on delete cascade,
  -- The anonymous learner code from the app. The machine identifier: two
  -- devices running the same learner code are two rows.
  learner_code  text not null,
  -- THE OFFICIAL NAME, and the only human identifier on this table.
  --
  -- Added 2026-10-22. It is the name on the attendance sheet, and the
  -- dashboard shows it as the roster's headline, because a teacher looking
  -- at "BAL-47" cannot put a face to it.
  --
  -- The learner's in-game NICKNAME is deliberately NOT here and never will
  -- be: a nickname is a child's joke, not a legal name, and this table is a
  -- record of real children.
  --
  -- NULLABLE on purpose. A row written before this column existed has no
  -- name in it, and the dashboard falls back to the learner code rather
  -- than showing a blank cell. The same is true of a device that has not
  -- reached the Profile screen yet.
  full_name     text,
  -- One install of the app on one device. Two devices with the same learner
  -- code are two rows, because they are two different histories.
  device_id     text not null,
  -- The whole record, as the learner app built it.
  payload       jsonb not null,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),

  -- The upsert key. The edge function writes with this conflict target, so
  -- a second sync from the same device UPDATES the row instead of adding a
  -- duplicate. This is what makes repeated syncs safe.
  constraint students_device_unique unique (class_id, learner_code, device_id)
);

comment on column public.students.payload is
  'The learner record as sent by QuizOn!. Carries the official full name; never the nickname.';
comment on column public.students.full_name is
  'The official student name. Mirrored out of payload.full_name so the roster can sort by it.';

-- THE MIGRATION, FOR A DATABASE THAT ALREADY EXISTS.
--
-- `create table if not exists` does not ADD a column to a table that is
-- already there, so a deployment that ran this file before 2026-10-22 has a
-- students table with no full_name column - and the index below would fail
-- against a missing column. So the column is added explicitly, and the
-- statement is safe to run on a fresh database too.
alter table public.students add column if not exists full_name text;

create index if not exists students_class_id_idx on public.students (class_id);
create index if not exists students_learner_code_idx on public.students (learner_code);
create index if not exists students_full_name_idx on public.students (full_name);
create index if not exists students_last_seen_idx on public.students (last_seen_at desc);

-- --- Row Level Security ----------------------------------------------------
alter table public.classes  enable row level security;
alter table public.students enable row level security;

-- A teacher owns their classes: read, create, rename, delete.
drop policy if exists "teacher reads own classes" on public.classes;
create policy "teacher reads own classes" on public.classes
  for select using (teacher_id = auth.uid());

drop policy if exists "teacher creates own classes" on public.classes;
create policy "teacher creates own classes" on public.classes
  for insert with check (teacher_id = auth.uid());

drop policy if exists "teacher updates own classes" on public.classes;
create policy "teacher updates own classes" on public.classes
  for update using (teacher_id = auth.uid());

drop policy if exists "teacher deletes own classes" on public.classes;
create policy "teacher deletes own classes" on public.classes
  for delete using (teacher_id = auth.uid());

-- A teacher reads the learners in their own classes.
--
-- The subquery runs with the CALLER's permissions, and classes has RLS too,
-- so it can only ever match a class this teacher owns. That is what stops
-- one teacher reading another teacher's roster.
drop policy if exists "teacher reads own class students" on public.students;
create policy "teacher reads own class students" on public.students
  for select using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  );

-- THERE IS DELIBERATELY NO INSERT OR UPDATE POLICY ON students.
-- The browser cannot write a student row. Only the edge function can, and
-- it does so with the service-role key, which bypasses RLS by design.
