# Deploying QuizOn! Teacher Dashboard

Everything below is free and needs no credit card. The whole stack costs
**$0.00** for a school-sized class.

| Piece | Where | Cost |
|---|---|---|
| Database + auth + sync endpoint | Supabase (Free tier) | $0 |
| Teacher dashboard | Vercel (Hobby) | $0 |
| Student PWA | Cloudflare Pages or Netlify | $0 |
| A hotspot for the sync window | The teacher's phone | $0 |

---

## 1. Create the Supabase project (5 minutes)

1. Go to <https://supabase.com> → **Start a project**.
2. Pick the free tier. Choose a region near you (**Singapore** or **Tokyo**
   for the Philippines).
3. Save the database password somewhere. You will need it for the CLI.
4. Wait for the project to finish provisioning.

**Turn off email confirmation.** Go to **Authentication → Sign In / Providers
→ Email** and switch **Confirm email** OFF. A teacher who signs up should be
able to use the dashboard immediately, and email delivery is not something a
free project can be relied on for.

---

## 2. Create the tables (1 minute)

Open **SQL Editor → New query**, paste the whole of
[`supabase/schema.sql`](supabase/schema.sql), and press **Run**.

That creates the two tables, the indexes, and the Row Level Security
policies. It is safe to run again.

---

## 3. Deploy the sync endpoint (5 minutes)

The endpoint is a Supabase Edge Function. It is what a learner device POSTs
its record to.

### Install the CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
```

The project ref is the first part of your project URL:
`https://abcdefghijkl.supabase.co` → the ref is `abcdefghijkl`.

### Deploy it

```bash
cd supabase/functions/sync-student
supabase functions deploy sync-student --no-verify-jwt
```

**The `--no-verify-jwt` flag is required.** A learner device has no Supabase
account and therefore no JWT to verify. The function authenticates with the
service-role key instead. Without the flag every sync returns 401 and
nothing ever arrives.

You now have an endpoint URL:

```
https://YOUR-PROJECT.supabase.co/functions/v1/sync-student
```

---

## 4. Point the student app at it (2 minutes)

In the **student app** folder (`quizon/`):

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SYNC_ENDPOINT=https://YOUR-PROJECT.supabase.co/functions/v1/sync-student
```

Rebuild the app. The feature is **off** when this variable is empty, so a
build with no endpoint behaves exactly like the old one, with no network
calls and no error messages.

```bash
npm run build
```

---

## 5. Deploy the teacher dashboard (5 minutes)

### On Vercel

1. Push this folder to its own GitHub repository (it is deliberately a
   separate repository from the student app — see the note at the bottom).
2. Go to <https://vercel.com> → **Add New → Project** → import the repo.
3. Vercel detects Vite. Add the environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (Both are in Supabase → **Project Settings → API**.)
4. **Deploy.**

`vercel.json` is already there with the SPA rewrite, so `/classes/abc123`
works on a refresh.

### Locally, to try it first

```bash
npm install
cp .env.example .env      # fill it in
npm run dev               # http://localhost:5173
```

---

## 6. Deploy the student PWA (5 minutes)

The student app is a static PWA. It needs a host that rewrites unknown paths
to `/index.html`, because the router uses clean URLs (`/hub`, `/quiz/easy`).

**Cloudflare Pages** (free, unlimited bandwidth):

- Create a project → connect the GitHub repo → build command `npm run build`
  → output directory `dist`
- **Settings → Functions → Single-page application → ON**
- Environment variable: `VITE_SYNC_ENDPOINT`

**Netlify** works the same way: build `npm run build`, publish `dist`, and
`netlify.toml` handles the rewrite. (GitHub Pages does **not** do SPA
rewrites without a workaround, so it is not the first choice.)

---

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
