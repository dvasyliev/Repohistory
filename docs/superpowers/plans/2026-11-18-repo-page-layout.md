# Repo Page Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The repo page shows a row of metric tiles with one big chart for the selected tile instead of nine stacked charts; forks get a daily/cumulative switch; open issues are dropped from storage.

**Architecture:** The page starts every read as a promise (each with a `.catch` fallback) and passes them to one client component in the route's `_components`, which reads them with `use()` inside per-tile `Suspense` and renders the existing chart components for the selected tile. The selected tile lives in `?chart=` (nuqs). Tile numbers come from a pure helper in `lib/repo/metric-summary.ts`.

**Tech Stack:** Next.js 15.5, React 19 (`use`), nuqs, Recharts, D1 + Drizzle, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-repo-page-layout-design.md`

## Global Constraints

- Tile order and ids: `views`, `clones`, `stars`, `forks`, `commits`, `downloads`, `watchers`. With no `chart` parameter (or an unknown one), `views` is selected.
- Tile labels: "Views", "Clones", "Stars", "Forks", "Commits", "Downloads", "Watchers". A tile with no data shows "—".
- No new GitHub calls; pages keep the reads they do today.
- A failed read gives that tile "—" and its chart's empty state, never the error boundary.

## Review Focus

- A repo with no rows in D1 (new install): every tile shows "—" or 0, and each chart shows its empty state.
- `?chart=nonsense` in the URL: Views is selected and nothing crashes.
- Date range "all": tile numbers sum the whole series and the trend is hidden (no previous period).
- Releases fetch failing on GitHub: the Downloads tile shows "—" and the other tiles still load.
- Mobile width (400 px): tiles wrap two per row, the tables stack, and nothing scrolls sideways.

---

### Task 1: Drop open issues from storage

**Files:** `lib/db/schema.ts`, `lib/db/traffic.ts`, `lib/repo/github-stats.ts`, `lib/traffic-rows.ts`, the matching `*.spec.ts` files, `drizzle/0003_*.sql` (generated)

- [ ] Remove `openIssues` from the schema, `CounterHistory`, `CounterRow`, `fetchCounters` and the upsert's `set`, and from the spec fixtures.
- [ ] `npm run db:generate`. Expected: one migration with `ALTER TABLE repo_counters DROP COLUMN open_issues`.
- [ ] `npx vitest run lib` passes, and `npm run typecheck` is clean (the counters chart still compiles after removing its `openIssues` line).
- [ ] `npm run db:migrate:local` and `npm run db:migrate:remote`. Expected: remote `PRAGMA table_info(repo_counters)` has no `open_issues`.
- [ ] Commit `feat(db): drop open issues from repo counters`.

### Task 2: Forks daily/cumulative switch

**Files:** `app/components/charts/forks-chart.tsx`

- [ ] Add the same switch as `stars-chart.tsx` (state `"cumulative" | "daily"`, default `"cumulative"`). The description and the total label follow the mode: cumulative shows the last cumulative value; daily shows the sum of `daily` in range.
- [ ] `npm run typecheck`, then lint the file.
- [ ] Commit `feat: add a daily view to the forks chart`.

### Task 3: Tile summaries

**Files:** create `lib/repo/metric-summary.ts`, `lib/repo/metric-summary.spec.ts`

**Produces:**
- `sumInRange(series: { date: string; value: number }[], range: DateRange): { value: number; trend: TrendData | null } | null`. Returns null when the series is empty. Sums the values in range, and computes the trend with `calculateTrendPercentage` against the whole series.
- `latestValue(series: { date: string; value: number }[]): number | null`

Tests:
- `sumInRange` over 4 days of values `[1, 2, 3, 4]` with a range covering the last 2 days gives `value: 7`, and its trend is an increase against the previous 2 days (3).
- An empty series gives `null`.
- A range of `{from: null, to: null}` sums everything, with `trend: null`.
- `latestValue([])` is `null`; `latestValue` of the dates `["2026-11-01", "2026-11-02"]` with values `[3, 5]` gives `5`.

Steps:
- [ ] Write the tests and see them fail.
- [ ] Implement.
- [ ] See them pass.
- [ ] Commit `feat: add tile summary helpers`.

### Task 4: Tiles and the big chart on the repo page

**Files:**
- Create: `app/[owner]/[repo]/_components/repo-insights.tsx` (client: tiles plus the selected chart), `app/[owner]/[repo]/_components/metric-tile.tsx`, `app/[owner]/[repo]/_lib/chart-param.ts` (nuqs `parseAsStringLiteral` of the tile ids, default `views`)
- Rename: `app/components/charts/counters-chart.tsx` to `watchers-chart.tsx`, a single "Watchers" line titled "Watchers"
- Modify: `app/[owner]/[repo]/page.tsx`, `app/components/charts/chart-wrappers.tsx` (delete the repo-page wrappers it no longer needs, and keep any still used elsewhere)

What it does:
- The page builds promises: stars, views, clones, forks, commit weeks, releases, counters, referrers, paths. Each gets `.catch(() => <empty value>)`, logged as `<fullName> <kind> read error`.
- `RepoInsights` renders 7 tiles in a grid (`grid-cols-2 md:grid-cols-4 xl:grid-cols-7`). Each tile is a `<button aria-pressed>` with its own `Suspense`, showing the label, the number and a `TrendIndicator`.
- Tile numbers:
  - Views, Clones: `sumInRange` of `total`.
  - Stars, Forks: `sumInRange` of `daily`.
  - Commits: `sumInRange` of `commits` by week.
  - Downloads: `totalDownloads`, no trend.
  - Watchers: `latestValue`.
- Under the tiles, the selected chart is the existing component fed the same resolved data, inside `Suspense` with its `isLoading` fallback.
- Below the chart, Referring Sites and Popular Content sit in `grid gap-6 lg:grid-cols-2`.

Steps:
- [ ] Implement.
- [ ] `npm run typecheck`, `npm run lint`, `npm run knip` and `npm run format:check` are clean.
- [ ] Browser check on the dev server with `playwright-cli -s=repo-layout`:
  - The page opens.
    - expect: 7 tiles, with Views pressed and the "Repo Views" chart shown.
  - Click Forks.
    - expect: the URL has `?chart=forks`, "Forks Over Time" is shown, and the switch toggles daily/cumulative.
  - Reload.
    - expect: Forks stays selected.
  - Width 400.
    - expect: tiles two per row and no sideways scroll.
  - Take one screenshot of the desktop layout.
- [ ] Measure the page before and after (`page-loading.md`): TTFB and HTML size.
- [ ] Commit `feat: show repo charts as tiles with one big chart`.

### Task 5: End-to-end

**Files:** `tests/dashboard/repo-stats.spec.ts` (rewrite), and `tests/dashboard/repo-stars.spec.ts` if it relies on the old layout

- [ ] Rewrite the test:
  - Open react-crash-course from home.
    - expect: tiles "Views" … "Watchers" are visible, and the "Repo Views" chart heading is shown.
  - Click "Forks".
    - expect: the URL has `chart=forks` and "Forks Over Time" is visible.
  - Click "Commits".
    - expect: "Commit Activity" is visible, and "Something went wrong" has a count of 0.
- [ ] `npx playwright test tests/dashboard` passes, then `npm run verify` passes with a clean log.
- [ ] Commit `test: cover the repo page tiles`.
- [ ] Push, then `npm run deploy`. Check the live page.
