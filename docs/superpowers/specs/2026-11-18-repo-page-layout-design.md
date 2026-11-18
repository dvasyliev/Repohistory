# Repo Page Layout Design

## Intent

The repo page (`/[owner]/[repo]`) stacks nine charts in one column. The owner gets lost scrolling and cannot tell at a glance what is shown. Goal: see every key number on one screen and open one chart at a time, like GitHub Insights.

## Goals

- A row of metric tiles at the top. Each tile shows a metric name, its number for the selected date range, and a trend against the previous period.
- Clicking a tile shows that metric's chart, full width, under the tiles. Only one big chart is shown at a time.
- The selected tile is in the URL (`?chart=views`, via nuqs). With no `chart` parameter, Views is selected.
- Referring Sites and Popular Content stay as tables under the big chart, side by side on desktop and stacked on mobile.
- Forks Over Time gets the same "daily / cumulative" switch as Stars Over Time, showing cumulative by default.
- The "Repository Counters" chart is removed. Watchers becomes its own tile with a single-line chart. Stars and forks repeat their own charts, and open issues are not needed (owner, 2026-11-18), so they are dropped.

## Tiles, in order

| Tile | Number shown | Big chart |
|------|--------------|-----------|
| Views | total views in range | existing Repo Views chart |
| Clones | total clones in range | existing Clones chart |
| Stars | stars gained in range | existing Stars Over Time |
| Forks | forks gained in range | Forks Over Time (with switch) |
| Commits | commits in range | existing Commit Activity |
| Downloads | release downloads | existing Release Downloads |
| Watchers | latest count | watchers line from `repo_counters` |

Desktop shows the 7 tiles in one row where they fit (4 per row on medium screens) and mobile shows 2. A tile with no data shows "—" and stays clickable; its chart shows the existing empty state.

## Open issues removed

The owner does not need open issues (2026-11-18): drop the `open_issues` column from `repo_counters` (its stored data goes too) and stop collecting it in the daily job.

## Non-goals

- No new data or GitHub calls (beyond dropping open issues). The tiles use the same D1 and GitHub reads the page already does.
- No change to the owner page (`/[owner]`) or the home page.

## Constraints

- Every tile loads behind its own skeleton, and one slow or failed source does not block or break the others. This follows `page-loading.md`.
- The date range picker keeps working, and the tile numbers follow it.

## Approaches

- **Tiles + one big chart (picked).** Everything key fits on one screen, and a link keeps the selected chart.
- Group tabs (Popularity / Traffic / Development) with charts two per row. Rejected: the numbers are hidden outside the open group.
- Everything on one page, two per row, with a sticky anchor menu. Rejected: it still needs scrolling.

## Left to the builder

- How data reaches the tiles and the big chart. Suggested: the page starts every read as a promise and passes the promises to a client component, which reads them with `use()` inside per-tile `Suspense`.
- Tile visuals, within the existing card style.
