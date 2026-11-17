# Move repohistory from Supabase + Vercel to Cloudflare

## Intent

Repohistory is a personal fork used by one person (the owner). Today it runs on Vercel, stores traffic history in Supabase Postgres and signs in through Supabase GitHub OAuth. The owner wants it on Cloudflare, the way the sibling project `../sink` runs: Cloudflare D1 for data, Cloudflare Workers for hosting, and sign-in by one private token instead of GitHub OAuth. Supabase and Vercel are dropped.

## Goals

- The site runs on Cloudflare Workers through OpenNext (`@opennextjs/cloudflare`), on the Workers Free plan.
- Traffic history (`views`, `clones`, `paths`, `referrers`) lives in one D1 database. History comes from the CSV exports of the hosted repohistory.com service, imported per repository (see "History import"). The Supabase backup (July 2025, 64 rows) is not imported.
- Every page and API route except the public ones asks for the owner's site token. The public ones stay open: `/star-history`, `/api/svg` and static files (README badges link to them).
- Repositories are listed and read through the owner's GitHub App, so no user GitHub token is needed. The App is private to the owner, so every installation is the owner's.
- The daily traffic job keeps running in GitHub Actions and writes to D1 through the Cloudflare D1 HTTP API.

## Non-goals

- Multi-user support, accounts or roles.
- Changing what the dashboards show or how charts look.
- Moving the daily job into a Cloudflare cron trigger (the Free plan's 50 subrequests per invocation are too few for 4 GitHub calls per repository).
- Workers Paid plan. If the deployed site exceeds the Free plan's 10 ms CPU per request, upgrading is a separate decision for the owner.

## Anti-goals

- The token, the GitHub App private key or the Cloudflare API token ending up in the repo, in client JavaScript or in logs.
- Public README badges (`/api/svg`) breaking.
- A Supabase dump (it holds `auth.users`) or the owner's CSV exports committed to the repo.

## Constraints

- Next.js 15.5 (OpenNext supports the latest minor of 15). Keep it; no Next 16 upgrade in this work.
- Workers Free: 10 ms CPU per request, 50 subrequests (GitHub and D1 calls) per request, 100,000 requests per day, 64 MiB uncompressed script.
- D1 Free: 5 M rows read and 100 k rows written per day, 500 MB per database. Rows read count rows scanned, so every query filters by an indexed `repo_id`.
- Cloudflare REST API: 1,200 requests per 5 minutes per user (applies to the daily job).
- Harness rules apply: `.claude/rules/external-requests.md` (one shared function per service with time limit and retries), `structure.md`, `libraries.md` (Zod for request and action input).
- AGPL-3.0: keep `LICENSE` and `lib/shared/LICENSE-STAR-HISTORY.md`.

## Approaches considered

1. **Vercel + D1 over HTTP.** Site stays on Vercel; every database call goes through the Cloudflare REST API (+100–300 ms each, extra API token). Rejected by the owner in favour of being on Cloudflare like Sink.
2. **Everything on Workers Paid ($5/month).** Site and daily job in Cloudflare, no limits in the way. Rejected: costs money; not needed if the Free plan holds.
3. **Everything on Workers Free.** The daily job would have to be split into many cron runs to stay under 50 subrequests. Rejected: fragile.
4. **Chosen: site on Workers Free with a D1 binding, daily job in GitHub Actions over the D1 HTTP API.** Free, the job has no per-invocation limit, and the site reads D1 directly without network latency.

## Design

### Hosting

- `@opennextjs/cloudflare` builds the Next.js app into a Worker. `wrangler.jsonc` declares the Worker, its assets and a D1 binding `DB`; `open-next.config.ts` uses the defaults (no incremental cache store unless the build requires one).
- `next.config.ts` calls the OpenNext dev helper so `next dev` gets the D1 binding locally (local D1 through wrangler).
- Secrets on the Worker: `SITE_TOKEN`, `APP_ID`, `APP_PRIVATE_KEY`. Supabase variables and `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` are no longer used. Plain variable: `NEXT_PUBLIC_SITE_URL` (used by the Star History markdown).
- Deploy with `opennextjs-cloudflare deploy` from the owner's machine (npm script `deploy`). Connecting Workers Builds to GitHub is left to the owner.

### Database

- Drizzle ORM, as in Sink. One schema file in `lib/db/schema.ts` with the four tables, matching the Supabase columns:
  - `views(repo_id, date, total, unique)`, `clones(repo_id, date, total, unique)`: primary key `(repo_id, date)`.
  - `paths(repo_id, path, date, total, unique)`: primary key `(repo_id, path, date)`.
  - `referrers(repo_id, referrer, date, total, unique)`: primary key `(repo_id, referrer, date)`.
  - `repo_id` is an integer, `date` an ISO `YYYY-MM-DD` text, `total` an integer. `unique` is an integer, nullable in `paths` and `referrers` (the CSV exports have no unique counts there); charts treat null as "no data", not 0.
  - For `paths` and `referrers`, `date` is the day the job ran (the Supabase tables filled it by a column default; D1 gets it explicitly from the job).
- Migrations with drizzle-kit in `drizzle/`, applied with `wrangler d1 migrations apply`.
- In the Worker, `lib/db/client.ts` returns a Drizzle client over the `DB` binding (`getCloudflareContext().env.DB`).
- `lib/repo/*.ts` and `lib/repo/owner-*.ts` take that client instead of the Supabase client and keep their merge logic (database history plus the live 14 days from GitHub, GitHub wins on matching dates).

### Daily job (GitHub Actions)

- `.github/workflows/cron.yaml` keeps its schedule and runs `lib/cron.ts` with `tsx`.
- `lib/update-traffic.ts` writes through a Drizzle client built on `drizzle-orm/sqlite-proxy` whose callback posts to the D1 REST query endpoint. That callback is the one shared function for the D1 HTTP API (time limit, retries on 429/5xx with backoff, logs failures), per `external-requests.md`.
- Upserts use `ON CONFLICT DO UPDATE` on the primary keys above, in batches so one repository costs one or two API calls.
- Actions secrets: `APP_ID`, `APP_PRIVATE_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (D1 edit only), `D1_DATABASE_ID`. The Supabase secrets go.

### Sign-in by site token

- `/signin` shows one password field and a button. A server action validates the input with Zod, compares SHA-256 of it with SHA-256 of `SITE_TOKEN` in constant time (as Sink's `verifySiteToken`), and on success sets an `HttpOnly`, `Secure`, `SameSite=Lax` cookie `site_session`, then redirects to `/`. A wrong token shows an error in place.
- The cookie holds an HMAC-SHA-256 of a fixed string keyed by `SITE_TOKEN`, so changing the token signs everyone out and the token itself is never stored in the browser. Lifetime 90 days.
- `middleware.ts` lets through `/signin`, `/star-history`, `/api/svg`, Next internals and static files; every other request without a valid cookie goes to `/signin` (API routes get 401).
- Sign out deletes the cookie. The user menu keeps only "Sign out" (no GitHub avatar).
- Removed: Supabase clients, `/auth/callback`, GitHub OAuth refresh (`lib/auth/refresh-token.ts`), `provider_token` cookies, `@supabase/*` packages.

### GitHub access without a user token

- `lib/octokit/get-repos.ts` lists installations with `app.eachInstallation` (all installations of the owner's GitHub App) instead of `GET /user/installations`, and keeps the owner grouping.
- Each page that reads one repository gets an installation Octokit for that repository's owner: `GET /repos/{owner}/{repo}/installation`, then `app.getInstallationOctokit(id)`. `getUserOctokit` is replaced by this.
- A shared function wraps GitHub calls with a time limit, per `external-requests.md`; Octokit's retry and throttling plugins stay as they are.

### History import

The owner has CSV exports from repohistory.com, one folder per repository, each with four files:

- `views.csv`, `clones.csv`: `Date,Total …,Unique …`, one row per day.
- `popular-content.csv`, `referrers.csv`: wide format, one row per day and one column per path or referrer (the daily top-10 snapshot, the same thing the daily job stores). Cells hold the total count. A 0 means "not in that day's top 10" and is skipped. `unique` is stored as null.

A script `scripts/import-csv.ts --repo <owner>/<name> --dir <folder>`:

- resolves `repo_id` through the GitHub App (`GET /repos/{owner}/{repo}` with an installation Octokit);
- parses the four files (header row names the columns; missing files are skipped with a message);
- upserts through the same D1 HTTP client as the daily job, in batches, so re-running it changes nothing;
- prints how many rows it wrote per table.

The owner runs it once per repository (`dvasyliev/react-crash-course` now, the chatbot and the React todo list later). Export folders live in `imports/`, which is gitignored. The exports end on the day they were made; the daily job fills days after that.

### Dates

The old job stored GitHub timestamps (`2025-06-22T00:00:00Z`) while the pages look days up as `YYYY-MM-DD`, so stored history older than 14 days never reached the charts. D1 stores `YYYY-MM-DD` and the job converts GitHub timestamps before writing, so stored history now shows. This is a bug fix, not a change in what the dashboards are meant to show.

### First step: prove the Worker

Before moving any data code, build the current app with OpenNext and deploy it to a test Worker, to check what the Free plan allows:

- The bundle fits the Worker size limit (check `wrangler` output against the current Cloudflare limits page).
- `/api/svg` renders. It draws the chart with `jsdom`, D3 and `svgo`; if `jsdom` does not run on Workers, replace it with `linkedom` in `app/api/svg/route.ts` only, leaving `lib/shared` (Star History, MIT) as it is.
- CPU time per request on `/api/svg` and the dashboard pages stays under 10 ms (`wrangler tail`). If it does not, stop and ask the owner: Workers Paid, or serve the badge another way.

### Docs

- `.env.example` lists every variable for local dev, the Worker and Actions.
- README gets a short "Fork" note (AGPL) and a "Deploy to Cloudflare" section: create D1, apply migrations, set Worker secrets, set Actions secrets, deploy, import CSV history.
- `CLAUDE.md` "What this is" and "Architecture" are updated to the new stack.

## Testing

- Unit (Vitest): CSV parsing for both formats (narrow views/clones, wide paths/referrers with zero cells skipped); token comparison and session cookie value; the D1 HTTP client (retries only 429/5xx, gives up after 3 tries, respects `Retry-After`); the upsert row building in `update-traffic` (timestamps become `YYYY-MM-DD`); the merge logic in `lib/repo/views.ts` against a fake client (stored days older than 14 show).
- End-to-end (Playwright, happy paths): signing in with the right token reaches the dashboard; a wrong token shows the error; `/star-history` opens without signing in.
- Manual after deploy: dashboard, owner and repo pages load on the Worker; `wrangler tail` shows no CPU-limit errors; the GitHub Action run writes rows (D1 row counts grow).

## Left to the builder

- Exact Drizzle query shapes and how the sqlite-proxy callback maps batch calls to the REST endpoint.
- Whether `/api/export/[repoId]` keeps CSV and ZIP output unchanged (it should; only its data source changes).
- File placement inside `lib/` per `structure.md`.
