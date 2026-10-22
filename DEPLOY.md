# Deploying QuizOn! Teacher Dashboard

Everything below is free and needs no credit card. The whole stack costs
**$0.00** for a school-sized class.

| Piece | Where | Cost |
|---|---|---|
| Database + auth + sync endpoint | Supabase (Free tier) | $0 |
| Teacher dashboard | Vercel (Hobby) or Netlify | $0 |
| Student PWA | Cloudflare Pages, Netlify or Vercel | $0 |
| A hotspot for the sync window | The teacher's phone | $0 |

---

## STATUS: what is already live

| Piece | Where it is | Done |
|---|---|---|
| Supabase project | `https://qovrlursadsjkdyowqwc.supabase.co` | ✅ |
| Database + RLS policies | `supabase/schema.sql` applied | ✅ |
| Teacher account | `caberojohnmarktinampay12@gmail.com` | ✅ |
| Teacher dashboard | **https://quizon-teacher.netlify.app** | ✅ deployed and tested |
| Student PWA | **https://quizon-365.netlify.app** | ✅ deployed and tested |
| Teacher repo | `github.com/Marky012/quizon-teacher-dashboard` | ✅ pushed |
| Sync edge function | `supabase/functions/sync-student` | ⬜ **the one thing left** |

### The one thing left: deploy the edge function

The function is the endpoint a learner device POSTs its record to. It is
10 lines of code and the Dashboard can deploy it in two minutes:

1. Supabase Dashboard → **Edge Functions** → **Create a new function**
2. Name it `sync-student`
3. Paste the whole of [`supabase/functions/sync-student/index.ts`](supabase/functions/sync-student/index.ts)
   (also on GitHub, in the `supabase/functions/sync-student/` folder)
4. **Deploy**
5. Open the function → turn **Verify JWT OFF** (a learner device has no
   Supabase account, so there is no token to verify)

The endpoint is then:
`https://qovrlursadsjkdyowqwc.supabase.co/functions/v1/sync-student`

### RUN THE MIGRATION FIRST, 2026-10-22

The learner app now sends the learner's **official full name**, so the
`students` table needs a `full_name` column, and the edge function needs to
be on schema version 2.

**Order matters. The database first, then the function, then the dashboard.**

1. Supabase Dashboard → **SQL Editor** → **New query** → paste
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   The file is safe to run on a database that already has the old schema:
   the new column is added with `alter table ... add column if not exists`,
   and every other statement is `if not exists` too.
2. Redeploy the edge function (the steps above), so it writes `full_name` and
   accepts `schemaVersion: 2`.
3. Deploy the dashboard (`npm run build`, then Netlify/Vercel).

**Why the order matters:** the dashboard reads the roster with `select *`, so
a dashboard deployed before the migration fails on a missing column and the
roster comes back empty. And a learner app on version 2 talking to a
function that only knows version 1 is refused outright - which is the right
behaviour, because a record stored with the wrong shape is worse than no
record.

### Or: let the CLI do it

If you would rather I finish it, create a Supabase **Personal Access
Token** at <https://supabase.com/dashboard/account/tokens>, give it to me,
and I will deploy the function and test the whole chain end to end. The
token can be revoked straight afterwards.

```bash
npm install -g supabase
supabase login --api-token <your-token>
supabase link --project-ref qovrlursadsjkdyowqwc --password "<db password>"
supabase functions deploy sync-student --no-verify-jwt
```

`--no-verify-jwt` is required. A learner device has no Supabase account and
therefore no JWT to verify; the function authenticates with the service-role
key that Supabase injects into every function automatically.

---

## The full setup, for anyone starting from scratch

### 1. Create the Supabase project (5 minutes)

1. Go to <https://supabase.com> → **Start a project**.
2. Pick the free tier. Choose a region near you (**Singapore** or **Tokyo**
   for the Philippines).
3. Save the database password somewhere. You will need it for the CLI.
4. Wait for the project to finish provisioning.

**Turn off email confirmation.** Go to **Authentication → Sign In / Providers
→ Email** and switch **Confirm email** OFF. A teacher who signs up should be
able to use the dashboard immediately, and email delivery is not something a
free project can be relied on for.

### 2. Create the tables (1 minute)

Open **SQL Editor → New query**, paste the whole of
[`supabase/schema.sql`](supabase/schema.sql), and press **Run**.

That creates the two tables, the indexes, and the Row Level Security
policies. It is safe to run again.

### 3. Deploy the sync endpoint

See the STATUS section above.

### 4. Point the student app at it (2 minutes)

In the **student app** folder (`quizon/`):

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SYNC_ENDPOINT=https://qovrlursadsjkdyowqwc.supabase.co/functions/v1/sync-student
```

This project already has that value as its built-in default, so a build
works without the file. The variable still wins if it is set, and an
**empty** value turns the feature off completely.

Rebuild the app. The feature is **off** when this variable is empty, so a
build with no endpoint behaves exactly like the old one, with no network
calls and no error messages.

```bash
npm run build
```

### 5. Deploy the teacher dashboard (5 minutes)

### On Netlify (what is live now)

```bash
npm install
npm run build
npx netlify-cli link --id f40ae6d4-c78a-4da1-b151-3ba2b9bf14f1
npx netlify-cli env:set VITE_SUPABASE_URL "https://qovrlursadsjkdyowqwc.supabase.co"
npx netlify-cli env:set VITE_SUPABASE_ANON_KEY "<publishable key>"
npx netlify-cli deploy --prod
```

### On Vercel

1. Push this folder to a GitHub repository.
2. Go to <https://vercel.com> → **Add New → Project** → import the repo.
3. Vercel detects Vite. Add the environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy.**

`vercel.json` is already there with the SPA rewrite, so `/classes/abc123`
works on a refresh.

### Locally, to try it first

```bash
npm install
cp .env.example .env      # fill it in
npm run dev               # http://localhost:5173
```

### 6. Deploy the student PWA (5 minutes)

The student app is a static PWA. It needs a host that rewrites unknown paths
to `/index.html`, because the router uses clean URLs (`/hub`, `/quiz/easy`).

**Netlify** (what is live now):

```bash
npx netlify-cli link --id 2034bc89-eb35-41b7-92d9-db68665a35d7
npx netlify-cli env:set VITE_SYNC_ENDPOINT "https://qovrlursadsjkdyowqwc.supabase.co/functions/v1/sync-student"
npx netlify-cli deploy --prod
```

`netlify.toml` in the student repo carries the SPA redirect and the
no-cache headers for `index.html` and `sw.js`, which is what makes an
update actually reach a learner's phone.

**Cloudflare Pages** and **Vercel** work the same way. (GitHub Pages does
**not** do SPA rewrites without a workaround, so it is not the first
choice.)

### 7. Connect the sites to GitHub, so a push deploys by itself

The live sites were deployed from the command line, so a `git push` does not
trigger a build yet. To wire that up, in Netlify:

**Site configuration → Build & deploy → Continuous deployment → Connect to
Git** → pick the repository → set the base directory, build command and
publish directory from the tables above.

Do it for both sites. After that, pushing the teacher app deploys the
dashboard, and pushing the student app deploys the PWA.

## 7. The everyday workflow

1. The teacher opens the dashboard and **creates a class**. A code appears,
   like `QZ-4821`.
2. The teacher writes the code on the board, or shares it however the class
   normally shares information.
3. Each learner opens QuizOn! → **Settings → Sync to your class** → types the
   code once. It works with no internet at all.
4. The teacher turns on a **hotspot** for a few minutes.
5. Devices that have the class code and something worth reporting send their
   record automatically.
6. The teacher's dashboard shows the roster, the flags, and the per-skill
   picture.

**The sync window can be as short as the teacher needs.** A record waits on
the device until it can be sent, and because the record is a full snapshot
rather than a list of changes, a missed sync costs nothing: the next one
carries everything.

---

## What is and is not synced

**Synced:** the eight skills (lesson learned, helper earned, helper called,
best check score), the three levels (attempts, scores, best, passed, the
passage, whether a hint was used, the needs-attention flag), the totals, the
per-skill miss counts, the ids of the items that were missed, and the app's
own report and recommendations.

**Not synced:** the learner's nickname (the app never sends it), the
learner's gender, the answer history, and any preference.

**Never stored on the server:** a name. The learner code is the only
identifier that travels.

---

## Why the dashboard is a separate repository

Four reasons, in order of how much they matter:

1. **Size.** The student PWA precaches ~10 MB. The teacher dashboard is a
   different app with a different dependency tree, and code-splitting a
   teacher's login screen into every learner's phone download would undo the
   single biggest win this project has (142 MB of lesson video replaced with
   ~10 MB of text rules and synthesized audio).
2. **Access.** The student app is public and served to children. The teacher
   dashboard is a logged-in app for an adult. They should not share an
   origin, a session, or a localStorage.
3. **Deploys.** The teacher dashboard ships whenever a dashboard change
   happens. The student app ships when the CONTENT changes, and a content
   release should never be able to break the dashboard.
4. **Failure.** If the dashboard is down, the students' game still works.
   The two apps do not share a release.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Learners never appear | `VITE_SYNC_ENDPOINT` empty in the student build | Check the build environment variable and rebuild |
| Everything is 401 at the function | The function was deployed without `--no-verify-jwt` | Redeploy with the flag |
| "That class code is not one of ours" | The code was typed with the wrong characters | The app normalises case, spaces and dashes, so it must be the wrong code |
| The dashboard says it is not connected | `.env` is missing in the teacher app | Copy `.env.example` to `.env` and fill it in |
| A learner's record is stale | The device has not been online since the last change | The record waits on the device; it sends the next time there is a connection |
