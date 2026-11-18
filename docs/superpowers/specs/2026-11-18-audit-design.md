# Audit: page speed, external requests, React performance

Audit of 2026-11-18 against the page-speed, resilience and best-practices modules. All 13 findings were chosen by the owner. Each area is fixed in order and ticked when done.

- [x] **data-loading.md (page-speed)**
  1. `app/components/repo/repo-card-content.tsx`, `owner-card-content.tsx`: each home card calls GitHub `getViews` live. Fix: read the last 14 days of views for all repos from D1 in one query and pass each card its series.
  2. `lib/repo/owner-*.ts`, `app/components/charts/owner-chart-wrappers.tsx`: each owner chart reads the full history of every repo separately. Fix: sum by day in SQL (`GROUP BY date`) and read each history once per request.
- [x] **page-loading.md (page-speed)**
  3. `lib/octokit/get-repos.ts`, `lib/repo/*`: nothing is cached, and every visit walks all installations and repos on GitHub. Fix: wrap `getRepos` in React `cache()`, configure the OpenNext KV incremental cache (new KV namespace), and cache the repo list (about 1 h) and GitHub traffic reads (about 6 h) with tags.
  4. `app/[owner]/page.tsx`, `app/[owner]/[repo]/page.tsx`: the page waits for GitHub before showing anything, and there is no `loading.tsx`. Fix: add `loading.tsx` for both, show the shell at once, and move the awaits under `Suspense`.
  5. `app/components/layout/revalidate-on-focus.tsx`: every refocus after 1 minute re-renders the whole page. Fix: raise the interval to 15 minutes.
- [x] **external-requests.md (resilience)**
  6. `lib/octokit/timed-fetch.ts`: no retries for 429/502/503/504 or network errors on the site, and a 10 s limit for page requests. Fix: one shared retry in `timedFetch` (2 tries, exponential backoff with jitter, `Retry-After` respected), about 4 s on pages and longer for the cron, and Octokit's own retry off.
  7. `lib/repo/github-stats.ts`: commits on the page wait 3 s and retry while GitHub computes. Fix: one call with no sleep on the page; a 202 shows "still counting" at once. The cron keeps no commit fetch.
  8. `lib/repo/*`, cards: a GitHub or D1 failure shows as zeros or an empty chart. Fix: the read functions throw, and each chart or card has an error boundary with the error and a "Try again" button.
  9. (not needed: Task 1 removed every per-repo GitHub call) `owner-card-content.tsx`, `lib/repo/owner-*.ts`: per-repo requests run all at once. Fix: cap them at 5 at a time with a small shared helper (where any remain after finding 1).
  10. `lib/shared/common/star-utils.ts` (`/api/svg`): the avatar fetch has no time limit or response check. Fix: a 3 s limit and an `ok` check, with no avatar on failure.
- [x] **vercel-react-best-practices (best-practices)**
  11. `app/[owner]/[repo]/_components/repo-insights.tsx`: the code of all charts loads at once. Fix: load each chart with `next/dynamic` when its tile is selected.
  12. `lib/contexts/date-range-context.tsx`: the date range and the context value are new on every render. Fix: `useMemo` and `useCallback`.
  13. Stars, forks, views and clones charts: both daily and cumulative values go to the browser. Fix: send the daily series only and compute the cumulative values in the browser.
