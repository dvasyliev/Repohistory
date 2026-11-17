# Cloudflare Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run repohistory on Cloudflare Workers with D1, sign-in by one site token, repositories read through the owner's GitHub App, and history imported from repohistory.com CSV exports.

**Architecture:** OpenNext builds the Next.js 15 app into a Worker with a D1 binding `DB`. Drizzle defines one schema used two ways: over the binding in the Worker, and over the D1 REST API (sqlite-proxy) from Node scripts (daily GitHub Action, CSV import). A cookie signed with `SITE_TOKEN` gates every page except the public Star History ones.

**Tech Stack:** Next.js 15.5, `@opennextjs/cloudflare`, wrangler, Cloudflare D1, drizzle-orm + drizzle-kit, Octokit App, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-cloudflare-migration-design.md`

## Global Constraints

- Next.js stays on 15.5; no Next 16 upgrade.
- Workers Free: 10 ms CPU per request, 50 subrequests per request. D1 Free: 5 M rows read, 100 k rows written per day, 500 MB.
- Every D1 query filters by `repo_id` (primary keys start with `repo_id`).
- Dates are stored as `YYYY-MM-DD` text.
- `unique` is nullable in `paths` and `referrers`; null renders as "no data", never 0.
- Public without a session: `/signin`, `/star-history`, `/api/svg`, Next internals, static files. API routes without a session get 401; pages redirect to `/signin`.
- Secrets never reach client JavaScript, logs or git: `SITE_TOKEN`, `APP_PRIVATE_KEY`, `CLOUDFLARE_API_TOKEN`. `imports/` stays gitignored.
- One shared function per outside service with a time limit and retries only on 429/5xx/network errors, at most 3 tries, honouring `Retry-After` (`.claude/rules/external-requests.md`).
- Keep `LICENSE` and `lib/shared/LICENSE-STAR-HISTORY.md`; `lib/shared/` changes only where a task says so.
- Steps marked **(owner)** need the owner at the keyboard (Cloudflare login, secrets, dashboard). Stop and ask; do not work around them.

## Review Focus

- A GitHub App installation that is suspended: skipped in listing and in the daily job, never an error page.
- A repository with no stored history and no GitHub traffic: pages render empty charts, not a crash (`views` arrays empty).
- A session cookie that is present but forged or from an old token: treated as signed out (redirect / 401), not as an error.
- A CSV with a header but no rows, or a wide CSV whose column header contains a comma inside quotes: imports 0 rows / parses the column name correctly.
- The D1 REST API answering 429 with `Retry-After: 120` during the daily job: fails that repository at once (longer than the job waits), logs it, and carries on with the next repository.

---

### Task 1: Prove the app runs on a Worker

**Files:**
- Create: `wrangler.jsonc`, `open-next.config.ts`
- Modify: `package.json` (scripts `preview`, `deploy`, `cf-typegen`), `next.config.ts` (OpenNext dev init), `.gitignore` (`.open-next/`, `.wrangler/`, `.dev.vars`)
- Possibly modify: `app/api/svg/route.ts` (jsdom → linkedom)

**Interfaces:**
- Produces: `npm run preview` (local Worker), `npm run deploy` (`opennextjs-cloudflare build && opennextjs-cloudflare deploy`); Worker name `repohistory`.

- [ ] **Step 1:** Read the current OpenNext Cloudflare "Get started" and "Existing Next.js app" docs; install `@opennextjs/cloudflare` and `wrangler` as dev dependencies at the versions the docs give for Next 15.
- [ ] **Step 2:** Add `wrangler.jsonc` (`main: .open-next/worker.js`, `assets.directory: .open-next/assets`, `compatibility_flags: ["nodejs_compat"]`, a recent `compatibility_date`), `open-next.config.ts` with defaults, and the scripts above.
- [ ] **Step 3:** Run `npm run preview` with `APP_ID`, `APP_PRIVATE_KEY` in `.dev.vars`. Expected: build succeeds; wrangler prints the bundle size; `/star-history` opens.
- [ ] **Step 4:** Open `/api/svg?repo=vercel/next.js&type=Date`. If it fails because of `jsdom`, swap it for `linkedom` (`parseHTML`) in `app/api/svg/route.ts` only and rerun. Expected: an SVG response.
- [ ] **Step 5 (owner):** `npx wrangler login`, then `npm run deploy`. Expected: a `*.workers.dev` URL.
- [ ] **Step 6:** With `npx wrangler tail repohistory`, load `/star-history` and `/api/svg?...` on the deployed URL. Expected: no "exceeded CPU" errors. If there are, stop and report to the owner (spec: Paid plan or another way to serve badges).
- [ ] **Step 7:** Commit (`build: deploy on Cloudflare Workers with OpenNext`).

### Task 2: D1 schema and Worker client

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/client.ts`, `drizzle.config.ts`, `drizzle/0000_*.sql` (generated)
- Modify: `wrangler.jsonc` (`d1_databases: [{ binding: "DB", database_name: "repohistory", database_id, migrations_dir: "drizzle" }]`), `package.json` (`db:generate`, `db:migrate:local`, `db:migrate:remote`)

**Interfaces:**
- Produces: tables `views`, `clones` (`repoId`, `date`, `total`, `unique`; PK `(repo_id, date)`), `paths` (`repoId`, `path`, `date`, `total`, `unique` nullable; PK `(repo_id, path, date)`), `referrers` (same with `referrer`); SQL column names `repo_id, date, total, unique, path, referrer`.
- Produces: `type Db = BaseSQLiteDatabase<"async", unknown, typeof schema>` and `getDb(): Db` in `lib/db/client.ts` (Drizzle over `getCloudflareContext().env.DB`).

- [ ] **Step 1:** Install `drizzle-orm`, `drizzle-kit`. Write the schema with `sqliteTable` and composite `primaryKey`.
- [ ] **Step 2:** `npm run db:generate`. Expected: one SQL migration with four `CREATE TABLE` statements and their primary keys.
- [ ] **Step 3 (owner):** `npx wrangler d1 create repohistory`; put the id into `wrangler.jsonc`.
- [ ] **Step 4:** `npm run db:migrate:local` and `npm run db:migrate:remote`. Expected: `wrangler d1 execute repohistory --remote --command "select name from sqlite_master"` lists the four tables.
- [ ] **Step 5:** Commit (`feat(db): add D1 schema and client`).

### Task 3: D1 HTTP client for Node scripts

**Files:**
- Create: `lib/db/http.ts`, `lib/db/http.spec.ts`

**Interfaces:**
- Consumes: `schema`, `Db` from Task 2.
- Produces: `createHttpDb(config: { accountId: string; databaseId: string; apiToken: string; fetch?: typeof fetch }): Db` (drizzle `sqlite-proxy`, batch callback supported), and `queryD1(config, statements: { sql: string; params: unknown[] }[]): Promise<D1Result[]>` — the one shared function: `POST https://api.cloudflare.com/client/v4/accounts/{accountId}/d1/database/{databaseId}/query`, `AbortSignal.timeout(15000)`, up to 3 tries with exponential backoff and jitter on 429/502/503/504/network errors, `Retry-After` over 30 s fails at once, every failure logged with status and duration.

- [ ] **Step 1: Write the failing tests** (fake `fetch`):
  - `retries a 503 and returns the second answer` — fetch called 2 times, result returned.
  - `does not retry a 400` — fetch called once, throws with the API error message.
  - `gives up after 3 tries on 429` — fetch called 3 times, throws.
  - `fails at once when Retry-After is 120` — fetch called once, throws.
  - `sends sql and params to the query endpoint with the bearer token` — URL, method `POST`, `Authorization: Bearer <token>`, body.
- [ ] **Step 2:** `npx vitest run lib/db/http.spec.ts` — Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `queryD1` and `createHttpDb` in `lib/db/http.ts`.
- [ ] **Step 4:** Rerun — Expected: PASS.
- [ ] **Step 5:** Commit (`feat(db): add D1 HTTP client with retries`).

### Task 4: Daily job writes to D1

**Files:**
- Modify: `lib/update-traffic.ts`, `lib/cron.ts`, `.github/workflows/cron.yaml`
- Create: `lib/traffic-rows.ts`, `lib/traffic-rows.spec.ts`

**Interfaces:**
- Consumes: `createHttpDb` (Task 3), schema (Task 2).
- Produces: `toDailyRows(repoId: number, items: { timestamp: string; count: number; uniques: number }[]): DailyRow[]`; `toPathRows(repoId: number, items: { path: string; count: number; uniques: number }[], date: string): PathRow[]` (strips `/{owner}/{repo}` prefix, `/` when empty, sums duplicates); `toReferrerRows(repoId, items, date): ReferrerRow[]`; `upsertTraffic(db: Db, rows: { views; clones; paths; referrers }): Promise<void>` (`onConflictDoUpdate` on each PK, one `db.batch`).

- [ ] **Step 1: Write the failing tests:** `toDailyRows` turns `2025-06-22T00:00:00Z` into `2025-06-22`; `toPathRows` maps `/dvasyliev/react-crash-course/tree/main` to `/tree/main`, the bare repo path to `/`, and sums two items that strip to the same path; every path row carries the given `date`.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement `lib/traffic-rows.ts`; rewrite `updateTraffic(installationId: number, db: Db)` to fetch the four traffic endpoints (as now), build rows, `upsertTraffic`. Skip suspended installations in `lib/cron.ts`; one repository's failure is logged and the loop continues. Today's date for paths/referrers is the UTC date of the run.
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Workflow env: `APP_ID`, `APP_PRIVATE_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `D1_DATABASE_ID`; remove Supabase secrets.
- [ ] **Step 6 (owner):** create a Cloudflare API token with D1 Edit only; add the five Actions secrets; run the workflow by hand. Expected: `select count(*) from views` on the remote DB is above 0.
- [ ] **Step 7:** Commit (`feat(cron): write daily traffic to D1`).

### Task 5: CSV history import

**Files:**
- Create: `scripts/import-csv.ts`, `lib/csv-history.ts`, `lib/csv-history.spec.ts`

**Interfaces:**
- Consumes: `createHttpDb`, `upsertTraffic` (Task 4), `app` (`lib/octokit/app.ts`).
- Produces: `parseDailyCsv(text: string, repoId: number): DailyRow[]` (`Date,Total …,Unique …`); `parseWideCsv(text: string, repoId: number, kind: "paths" | "referrers"): PathRow[] | ReferrerRow[]` (header = column names; zero cells skipped; `unique: null`).

- [ ] **Step 1: Write the failing tests:** narrow CSV of 2 rows gives 2 rows with numbers; wide CSV `Date,/,/commits/main` with `2025-07-05,136,0` gives one row `{ path: "/", total: 136, unique: null, date: "2025-07-05" }`; header-only CSV gives `[]`; a quoted header `"a,b"` is one column.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement the parsers (a small RFC 4180 splitter; no library). Implement the script: args `--repo owner/name --dir path`, resolve the repo id with the installation Octokit for that owner, read the four files (missing one: message, skip), `upsertTraffic` in batches of 500 rows, print counts per table.
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** `npx tsx scripts/import-csv.ts --repo dvasyliev/react-crash-course --dir imports/dvasyliev__react-crash-course` (with the Task 4 env in `.env.local`). Expected: counts printed; running it again prints the same counts and the remote row totals do not change.
- [ ] **Step 6:** Commit (`feat: import traffic history from CSV exports`).

### Task 6: Pages read history from D1

**Files:**
- Create: `lib/db/traffic.ts`, `lib/repo/views.spec.ts`
- Modify: `lib/repo/{views,clones,paths,referrers}.ts`, `lib/repo/owner-{views,clones,paths,referrers}.ts`, `app/[owner]/page.tsx`, `app/[owner]/[repo]/page.tsx`, `app/api/export/[repoId]/route.ts`, the chart wrappers that pass `supabase`
- Modify: the chart components that show `unique` for paths/referrers (null → no value shown)

**Interfaces:**
- Consumes: `Db`, `getDb` (Task 2).
- Produces: `getDailyHistory(db: Db, table: "views" | "clones", repoId: number): Promise<{ date: string; total: number; unique: number }[]>`; `getPathHistory(db, repoId)`; `getReferrerHistory(db, repoId)` — all ordered by `date`. `lib/repo/*` functions take `db: Db` where they took `supabase`; return shapes unchanged.

- [ ] **Step 1: Write the failing test** `lib/repo/views.spec.ts` with a fake `Db`/history function and fake Octokit: stored day 40 days ago appears in `views` with its counts; a day present in both sources takes GitHub's numbers; no stored rows and no GitHub views gives `{ count: 0, uniques: 0, views: [] }`.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement `lib/db/traffic.ts`; switch the `lib/repo` functions and their callers from Supabase to `getDb()`.
- [ ] **Step 4:** Run — Expected: PASS; `npm run typecheck` passes.
- [ ] **Step 5:** Commit (`feat: read traffic history from D1`).

### Task 7: GitHub access through the App

**Files:**
- Create: `lib/octokit/installation.ts`
- Modify: `lib/octokit/get-repos.ts`, every caller of `getUserOctokit` (`app/components/dashboard-content.tsx`, `app/components/charts/chart-wrappers.tsx`, `app/components/charts/owner-chart-wrappers.tsx`, `app/components/repo/repo-card-content.tsx`, `app/components/repo/owner-card-content.tsx`, `app/[owner]/page.tsx`, `app/[owner]/[repo]/page.tsx`, `app/api/export/[repoId]/route.ts`)
- Delete: `lib/octokit/get-user-octokit.ts`

**Interfaces:**
- Produces: `getInstallationOctokit(owner: string): Promise<Octokit>` (finds the non-suspended installation whose account login equals `owner`, case-insensitive; wrapped in React `cache` so one request looks it up once; unknown owner → `notFound()`); `getRepos(): Promise<{ repos: Repo[]; reposByOwner: Record<string, Repo[]>; shouldShowOwnerView: boolean }>` via `app.eachInstallation`.

- [ ] **Step 1:** Implement both; replace every `getUserOctokit()` with `getInstallationOctokit(owner)` (the owner of the page or repo being shown).
- [ ] **Step 2:** `npm run typecheck` and `npm run preview`; open `/`, `/<owner>`, `/<owner>/<repo>` with `APP_*` in `.dev.vars`. Expected: the same repositories and charts as before the change; `wrangler` log shows no subrequest-limit errors.
- [ ] **Step 3:** Commit (`feat: read GitHub through the App installation`).

### Task 8: Sign-in by site token

**Files:**
- Create: `lib/auth/session.ts`, `lib/auth/session.spec.ts`, `app/signin/_lib/actions.ts`
- Modify: `app/signin/page.tsx` (token form), `middleware.ts`, `lib/actions/auth.ts` (only `signout`), `app/components/layout/dropdown-wrapper.tsx` (menu with "Sign out" only), `app/(dashboard)/error.tsx`, `app/[owner]/error.tsx` (no signout on error; show the error with a retry)
- Delete: `app/auth/callback/`, `app/components/auth/signin-button.tsx`, `lib/auth/refresh-token.ts`, `lib/supabase/`

**Interfaces:**
- Produces: `SESSION_COOKIE = "site_session"`; `verifyToken(provided: string, expected: string): Promise<boolean>` (SHA-256 both, constant-time compare); `sessionValue(siteToken: string): Promise<string>` (HMAC-SHA-256 of `"repohistory-session"` keyed by the token, hex); `isValidSession(cookie: string | undefined, siteToken: string): Promise<boolean>`. Web Crypto only (runs in middleware).

- [ ] **Step 1: Write the failing tests:** `verifyToken` true for equal, false for different and for empty; `isValidSession` true for `sessionValue(token)`, false for a value made with another token, false for `undefined`.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement `session.ts`; the server action validates `{ token: z.string().min(1) }`, on success sets the cookie (`httpOnly`, `secure`, `sameSite: "lax"`, `path: "/"`, `maxAge` 90 days) and redirects to `/`; on failure returns `{ error: "Wrong token" }` shown with `role="alert"`. Middleware allows the public paths from Global Constraints, else 401 for `/api/*` and redirect to `/signin` for pages. Sign out deletes the cookie and redirects to `/signin`.
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Remove `@supabase/ssr`, `@supabase/supabase-js`; `npm run check`. Expected: green (knip finds nothing left of Supabase).
- [ ] **Step 6:** Commit (`feat(auth): sign in with a site token`).

### Task 9: Docs and environment

**Files:**
- Create: `.env.example`
- Modify: `README.md` (Fork note, "Deploy to Cloudflare"), `CLAUDE.md` ("What this is", "Architecture")

- [ ] **Step 1:** `.env.example` lists, grouped: Worker secrets (`SITE_TOKEN`, `APP_ID`, `APP_PRIVATE_KEY`) and var (`NEXT_PUBLIC_SITE_URL`); Actions and scripts (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `D1_DATABASE_ID`). README deploy steps in order: create D1, migrate, `wrangler secret put` ×3, Actions secrets, `npm run deploy`, CSV import command. CLAUDE.md describes D1, the token, the App and OpenNext instead of Supabase.
- [ ] **Step 2:** Commit (`docs: describe Cloudflare setup`).

### Task 10: End-to-end tests and production check

**Files:**
- Create: `tests/auth/signin.spec.ts`, `tests/star-history/public.spec.ts`
- Modify: `playwright.config.ts` (web server is `npm run dev` with `SITE_TOKEN=e2e-token` from `.dev.vars` or env)

- [ ] **Step 1: Write the tests:**
  - `signs in with the right token` — open `/`, expect redirect to `/signin`; fill the token, submit; expect URL `/` and the dashboard heading.
  - `shows an error for a wrong token` — submit `wrong`; expect an alert "Wrong token", URL still `/signin`.
  - `star history is public` — open `/star-history` without a cookie; expect its form, no redirect.
- [ ] **Step 2:** `npx playwright test tests/auth tests/star-history` — Expected: PASS; the run log has no errors.
- [ ] **Step 3 (owner):** `wrangler secret put SITE_TOKEN`, `APP_ID`, `APP_PRIVATE_KEY`; `npm run deploy`.
- [ ] **Step 4:** On the deployed URL: sign in; `/`, `/dvasyliev`, `/dvasyliev/react-crash-course` load and the repo page shows history back to August 2024; `wrangler tail` shows no CPU or subrequest-limit errors.
- [ ] **Step 5:** `npm run verify`, then commit (`test: cover sign-in and public star history`).
