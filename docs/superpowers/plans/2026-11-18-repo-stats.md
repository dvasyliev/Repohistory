# Repository Stats (Forks, Counters, Commits) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The daily job stores three more kinds of GitHub data in D1 (a daily counter snapshot, forks over time, weekly commit activity), and the repo page shows them as charts; the owner page shows summed forks over time.

**Architecture:** The daily job (`lib/update-traffic.ts`, Node, App with throttling on) collects the new data per repository next to traffic and stars and writes it through `upsertTraffic` in `lib/traffic-rows.ts`. Pages read D1 only (no new GitHub calls on Workers). Chart components follow the existing ones in `app/components/charts/`.

**Tech Stack:** Next.js 15.5 on Cloudflare Workers (OpenNext), D1 + Drizzle, Octokit App, Recharts, Vitest, Playwright.

**Spec:** none (owner chose the stats and placement in chat on 2026-11-18: daily counter snapshot, forks over time, commit activity; shown on the repo page, summed forks on the owner page). Builds on `docs/superpowers/plans/2026-11-18-stars-in-d1.md`.

## Global Constraints

- The GitHub App stays read-only (Metadata and Contents read are granted; add no permission).
- Workers Free: pages make no new GitHub calls; they read D1 only. D1: ≤ 100 bound parameters per statement; inserts ≤ 20 rows per statement (fewer when a row has more than 5 columns, so a statement stays ≤ 100 parameters); every query filters by `repo_id`; owner reads use `inArray` in chunks of ≤ 90 ids.
- Dates are `YYYY-MM-DD` text (UTC). Weeks are keyed by their start date (GitHub's Sunday, from the unix `week` field).
- Writes are idempotent. Forks and commit weeks are replaced per repository only after a successful fetch (delete that repo's rows, then insert, in the same batch), like stars.
- A failure in any new fetch for one repository is logged as `<full_name> <kind> error <message>` (kind: `counters`, `forks`, `commits`) and does not stop that repository's traffic, stars, or the other repositories.
- GitHub stats endpoints may answer 202 while computing: retry once after 3 seconds; if still 202, skip that repository's commit data for the day (stored weeks stay).
- Chart titles in English: "Forks Over Time", "Repository Counters", "Commit Activity".

## Data

- `repo_counters`: `repo_id`, `date`, `stars`, `forks`, `watchers`, `open_issues`; PK `(repo_id, date)`. One row per repository per run day. `watchers` is `subscribers_count` from `GET /repos/{owner}/{repo}` (the list endpoint has no real watcher count); the other three come from the same response.
- `forks`: `repo_id`, `date`, `count` (forks created that day); PK `(repo_id, date)`. From `GET /repos/{owner}/{repo}/forks` (`per_page` 100, `sort: "oldest"`, paged until a short page, at most 30 pages), grouped by `created_at` date.
- `commit_weeks`: `repo_id`, `week`, `commits`, `additions`, `deletions`; PK `(repo_id, week)`. Commits from `GET /repos/{owner}/{repo}/stats/commit_activity` (`total` per week); additions and deletions from `GET /repos/{owner}/{repo}/stats/code_frequency` (`[week, additions, deletions]`, deletions are negative there; store them as a positive number). Weeks present in only one endpoint store 0 for the other's fields.

## Review Focus

- A repository with no forks: the job writes no fork rows (after deleting old ones), and the chart shows its empty state.
- Stats endpoints answering 202 twice: commit weeks for that repository are kept, the job logs it and moves on.
- A repository the App can read but whose `GET /repos` fails: counters skipped and logged, traffic and stars still saved.
- The repo page for a repository with no rows in the new tables (before the first run): the three charts show their empty state, not an error boundary.
- A forked repository deleted later: it disappears from the fork series on the next run (replace semantics).

---

### Task 1: Collect and store the new stats

**Files:**
- Modify: `lib/db/schema.ts`, `lib/traffic-rows.ts`, `lib/traffic-rows.spec.ts`, `lib/update-traffic.ts`, `lib/update-traffic.spec.ts`
- Create: `lib/repo/github-stats.ts`, `lib/repo/github-stats.spec.ts`, `drizzle/0002_*.sql` (generated)

**Interfaces:**
- Produces: tables above; types `CounterRow`, `ForkRow`, `CommitWeekRow`; `toForkRows(repoId: number, createdAt: string[]): ForkRow[]`; `toCommitWeekRows(repoId: number, activity: { week: number; total: number }[], frequency: [number, number, number][]): CommitWeekRow[]`; `fetchForkDates(octokit, owner, repo): Promise<string[]>`; `fetchCommitStats(octokit, owner, repo, sleep?): Promise<{ activity; frequency } | null>` (null = still 202 after the retry); `fetchCounters(octokit, owner, repo, date): Promise<CounterRow>`; `upsertTraffic` accepts optional `counters?: CounterRow[]`, `forks?: { repoId: number; rows: ForkRow[] }`, `commitWeeks?: { repoId: number; rows: CommitWeekRow[] }` (replace semantics for the last two, like `stars`).

- [ ] **Step 1: Write the failing tests:**
  - `toForkRows(1, ["2026-11-01T10:00:00Z", "2026-11-01T23:00:00Z", "2026-11-03T01:00:00Z"])` gives `[{repoId:1,date:"2026-11-01",count:2},{repoId:1,date:"2026-11-03",count:1}]`.
  - `toCommitWeekRows` with activity week `Date.UTC(2026,10,1)/1000` total 5 and frequency `[[same week, 120, -30]]` gives `{week:"2026-11-01",commits:5,additions:120,deletions:30}`; a week only in frequency gets `commits: 0`.
  - `fetchCommitStats` with a fake octokit answering 202 then 200 returns the data after one retry (sleep stubbed); 202 twice returns null.
  - `upsertTraffic` with `forks` emits a delete filtered by repo_id before the fork inserts; with `commitWeeks` likewise; statements stay ≤ 100 parameters (commit week rows have 5 columns, counter rows 6: chunk counters by 16).
  - `updateTraffic`: a rejecting forks fetch logs `owner/repo forks error <msg>` and still upserts traffic with no `forks`; a null commit fetch passes no `commitWeeks`.
- [ ] **Step 2:** `npx vitest run lib/traffic-rows.spec.ts lib/repo/github-stats.spec.ts lib/update-traffic.spec.ts` — Expected: FAIL.
- [ ] **Step 3:** Implement; add the tables; `npm run db:generate` (Expected: one migration with three `CREATE TABLE`).
- [ ] **Step 4:** Rerun — Expected: PASS; `npm run typecheck`, `npx eslint` on touched files clean.
- [ ] **Step 5:** `npm run db:migrate:local` and `npm run db:migrate:remote`. Expected: the remote `sqlite_master` lists `repo_counters`, `forks`, `commit_weeks`.
- [ ] **Step 6:** Commit (`feat(db): store counters, forks and commit activity`).

### Task 2: Charts on the repo and owner pages

**Files:**
- Modify: `lib/db/traffic.ts`, `app/components/charts/chart-wrappers.tsx`, `app/components/charts/owner-chart-wrappers.tsx`, `app/[owner]/[repo]/page.tsx`, `app/[owner]/page.tsx`
- Create: `lib/repo/repo-stats.ts`, `lib/repo/repo-stats.spec.ts`, `app/components/charts/forks-chart.tsx`, `app/components/charts/counters-chart.tsx`, `app/components/charts/commit-activity-chart.tsx`

**Interfaces:**
- Consumes: Task 1 tables and row types.
- Produces: `getCounterHistory(db, repoId)`, `getForkHistoryForRepos(db, repoIds): Promise<Map<number, {date; count}[]>>`, `getCommitWeeks(db, repoId)` in `lib/db/traffic.ts`; `getRepoForks(db, repoId, stored?)` returning a cumulative daily series `{ date; daily; cumulative }[]` from the day before the first fork to today (same shape rules as `toCumulativeDays` in `lib/repo/stars.ts`; reuse it rather than copying); `getOwnerForks(db, repos)` summing per day.

- [ ] **Step 1: Write the failing tests** in `lib/repo/repo-stats.spec.ts` (fake history functions): forks `2026-11-01: 2`, `2026-11-03: 1` give cumulative 2 then 3 on those days and start at `2026-10-31` with 0; no rows give `[]`; a D1 read that throws gives `[]` and logs; owner forks for two repos sum per day.
- [ ] **Step 2:** `npx vitest run lib/repo/repo-stats.spec.ts` — Expected: FAIL.
- [ ] **Step 3:** Implement the read functions and three chart components, following `stars-chart.tsx` / `view-chart.tsx` for card layout, loading state (`isLoading`), and `no-data-message.tsx` for empty data. "Forks Over Time": cumulative area like stars. "Repository Counters": one line each for stars, forks, watchers, open issues by day. "Commit Activity": weekly commits as bars, additions and deletions as two lines (or a second small chart in the same card). Add them on the repo page under the existing charts, each in its own `<Suspense>` with the `isLoading` fallback; add an owner "Forks Over Time" with summed forks under the owner stars chart. A D1 failure in a wrapper shows the empty state, not the error boundary.
- [ ] **Step 4:** `npx vitest run lib`, `npm run typecheck`, `npm run lint`, `npm run knip`, `npm run format:check` — Expected: PASS/clean.
- [ ] **Step 5:** Commit (`feat: show forks, counters and commit activity`).

### Task 3: End-to-end check and rollout

**Files:**
- Create: `tests/dashboard/repo-stats.spec.ts`

- [ ] **Step 1:** e2e: sign in, open a repo page by clicking it on the home grid (as `tests/dashboard/repo-stars.spec.ts` does) — expect: headings "Forks Over Time", "Repository Counters", "Commit Activity" visible, no "Something went wrong". Run `npx playwright test tests/dashboard/repo-stats.spec.ts` — Expected: PASS.
- [ ] **Step 2:** `npm run verify` — Expected: all pass, log without errors.
- [ ] **Step 3:** Commit (`test: cover the new repo stats charts`). The controller pushes, deploys, runs the daily workflow, and checks the remote row counts of the three tables and the job log for `error` lines.
