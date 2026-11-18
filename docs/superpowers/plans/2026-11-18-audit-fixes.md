# Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 13 audit findings. Pages read stored data from D1, cache GitHub data in KV and reset it once a day, show their shell at once, retry and time-limit GitHub calls, show errors with a retry, and ship less JavaScript.

**Architecture:** Each task is one audit area, done in order. Task 2 adds the OpenNext KV incremental cache (binding `NEXT_INC_CACHE_KV`, namespace id `13390fc6144a4c5d964a7a6b267c1396`, already created). Cached GitHub reads use `unstable_cache`, with the "cache day" in the key so every entry resets once a day.

**Tech Stack:** Next.js 15.5 App Router, React 19, @opennextjs/cloudflare 1.20.16, D1 + Drizzle, Octokit App, Recharts, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-audit-design.md`

## Global Constraints

- Workers Free: 50 subrequests and 10 ms CPU per request. Pages make no more GitHub calls than today; most make fewer.
- The cache day is the UTC date at `now - 1 hour`, as `YYYY-MM-DD`. It changes at 01:00 UTC, one hour after the 00:00 UTC cron.
- Cached GitHub reads:
  - `getRepos` (repo list) and per-repo live reads (repo info, views, clones, referrers, paths, commit weeks).
  - Key: `[name, ...args, cacheDay()]`. `revalidate: 86_400`.
  - A commit result of `null` (GitHub still computing) is never cached: the cached function throws, and the caller turns the throw into `null`.
  - Values must be JSON-serializable. Never cache an Octokit instance.
- D1 reads are not cached.
- Do not change what the user can do: tiles, sorting, date ranges and charts behave as now.
- Commits: one per task, conventional messages ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; `git add` named paths only.
- Implementers run `npx vitest run <touched spec files>`, `npm run typecheck` and `npx eslint <touched files>`, but not `npm run check` or e2e.

## Review Focus

- First visit of a new cache day: data is fresh, and a page still renders within the subrequest limit.
- GitHub returns 202 for commits: the chart says "still counting" and the next visit asks again.
- GitHub down: charts and cards show an error with "Try again", and the rest of the page works.
- A repo with no D1 rows: cards and charts show their empty state, not an error.
- Local dev (`next dev`) without KV: the cache falls back to memory, and nothing crashes.

---

### Task 1: data-loading.md (findings 1, 2)

**Files:** `app/components/dashboard-content.tsx`, `app/components/repo/{repo-grid,sorted-repo-grid,repo-card,repo-card-content,owner-grid,owner-card,owner-card-content}.tsx`, `lib/db/traffic.ts`, `lib/repo/owner-*.ts`, `app/components/charts/owner-chart-wrappers.tsx`, and specs next to them.

- [ ] Finding 1: in `DashboardContent`, read the last 14 days of daily views for all repo ids in one D1 query: a new `getRecentViewsForRepos(db, repoIds, since): Promise<Map<number, DailyHistory[]>>`, chunked by 90 ids. Pass each card its series. Cards and owner cards stop calling GitHub `getViews`, and compute their sparkline, 7-day total and trend from that series exactly as today. Unit test: two repos, with rows grouped per repo and ordered by date.
- [ ] Finding 2: the owner charts (views, clones, stars, forks, referrers, paths) each read one per-owner aggregate. Add SQL aggregate readers in `lib/db/traffic.ts` that `GROUP BY date` (and `referrer` or `path` where needed) over the owner's repo ids, chunked by 90, and use them in `lib/repo/owner-*.ts` instead of summing per-repo histories in JS. Wrap each owner reader in React `cache()` so one request reads it once. Unit tests: sums for two repos per day match what the old JS summing gave.
- [ ] Commit `perf: read card views and owner charts from D1 aggregates`.

### Task 2: page-loading.md (findings 3, 4, 5)

**Files:** `open-next.config.ts`, `wrangler.jsonc`, `lib/cache-day.ts` (+ spec), `lib/octokit/get-repos.ts`, `lib/repo/{info,views,clones,referrers,paths,repo-stats}.ts`, `app/[owner]/page.tsx`, `app/[owner]/[repo]/page.tsx`, new `app/[owner]/loading.tsx` and `app/[owner]/[repo]/loading.tsx`, `app/components/layout/revalidate-on-focus.tsx`, `CLAUDE.md` (Architecture: the KV binding).

- [ ] `open-next.config.ts`: `defineCloudflareConfig({ incrementalCache: kvIncrementalCache })`, imported from `@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache`. `wrangler.jsonc`: `kv_namespaces: [{ binding: "NEXT_INC_CACHE_KV", id: "13390fc6144a4c5d964a7a6b267c1396" }]`.
- [ ] `lib/cache-day.ts`: `cacheDay(now = new Date()): string`. Tests: `2026-11-18T00:30Z` gives `2026-11-17`; `2026-11-18T01:00Z` gives `2026-11-18`.
- [ ] Cache the GitHub reads listed in the Global Constraints with `unstable_cache`. The cached function receives plain arguments (owner, repo, installation id) and builds its own Octokit inside, through `getApp()` and the installation id, so no Octokit crosses the cache. `getRepos` returns plain repo objects. Wrap `getRepos` in React `cache()` around the cached call.
- [ ] Finding 4: add `loading.tsx` for `[owner]` and `[owner]/[repo]` (Navbar-like header skeleton plus chart skeletons). On the repo page, render the `Navbar` and the `DateRangeProvider` from `params` without waiting for `getRepoInfo` where the Navbar can work from `owner` and `repo` alone; otherwise keep the await, since `loading.tsx` covers it.
- [ ] Finding 5: change the focus refresh interval from 1 minute to 15 minutes.
- [ ] Commit `perf: cache GitHub reads in KV and reset them daily`.

### Task 3: external-requests.md (findings 6, 7, 8, 9, 10)

**Files:** `lib/octokit/timed-fetch.ts` (+ spec), `lib/octokit/app.ts`, `lib/repo/github-stats.ts` (+ spec), `lib/repo/*.ts` read functions, `app/components/charts/chart-error-boundary.tsx` (new, client), the chart and card wrappers, `lib/map-limit.ts` (+ spec, only if any per-repo `Promise.all` to GitHub remains after Task 1), `lib/shared/common/star-utils.ts`.

- [ ] Finding 6: `timedFetch` retries GET requests on 429/502/503/504 and network errors, up to 2 tries in total. It waits `min(2^attempt * 500 ms + jitter(0–250 ms), Retry-After)`, and fails at once when `Retry-After` is over 5 s. Time limit: 4 s by default; `createApp({ throttle: true })` (the cron) passes 10 s. Octokit's own retry plugin is off (`retry: { enabled: false }`). Tests: 503 then 200 gives 200 after one retry; 404 is not retried; `Retry-After: 30` fails at once.
- [ ] Finding 7: `fetchCommitWeeks` makes one call with no sleep and returns `null` on 202. Remove the `sleep` parameter and update its spec.
- [ ] Finding 8: the page read functions stop swallowing errors into empty data. GitHub and D1 failures throw, and a missing D1 row is still an empty list. Add `ChartErrorBoundary` (client, React error boundary) that shows "Couldn't load <name>." with a "Try again" button (`router.refresh()` and reset). Wrap each chart and tile in the repo page `RepoInsights`, the owner page wrappers, and each home card's content. Tile errors show "!" with the error as its title. Update specs that expected `[]` on failure.
- [ ] Finding 9: if any per-repo `Promise.all` to GitHub remains, cap it at 5 with `mapLimit(items, 5, fn)`.
- [ ] Finding 10: in `getBase64Image`, set `signal: AbortSignal.timeout(3000)`, throw when the response is not ok, log, and fall back to no avatar.
- [ ] Commit `fix: retry GitHub calls and show chart errors with a retry`.

### Task 4: vercel-react-best-practices (findings 11, 12, 13)

**Files:** `app/[owner]/[repo]/_components/repo-insights.tsx`, `lib/contexts/date-range-context.tsx`, `lib/repo/stars.ts`, `lib/repo/repo-stats.ts`, `app/components/charts/{stars,forks}-chart.tsx`, owner equivalents.

- [ ] Finding 11: load each chart in `SelectedChart` with `next/dynamic`, using its `isLoading` render as `loading`.
- [ ] Finding 12: `dateRange` uses `useMemo([selectedPeriod])`, the context value uses `useMemo`, and the setter uses `useCallback`.
- [ ] Finding 13: the server sends stars and forks as `{ date, daily }[]`, and the charts compute the cumulative values in the browser through one shared helper in `lib/repo/cumulative.ts` (+ spec). Keep `toCumulativeDays` behaviour (start the day before the first entry, fill to today) in that helper.
- [ ] Commit `perf: load charts on demand and send less chart data`.

### Task 5: verify and roll out (controller)

- [ ] `npm run check` and `npm run verify` pass, with a clean log.
- [ ] Measure the three pages warm and cold before and after (`page-loading.md`).
- [ ] Browser check: home, owner and repo pages; the tiles switch charts; the error boundary is checked by temporarily breaking a read in dev.
- [ ] Tick the areas in the audit spec, commit, push, migrate remote (`0004`), deploy, and check the live pages and `wrangler tail` for errors.
