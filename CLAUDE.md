# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Repohistory is a personal fork of the open-source Repohistory dashboard (AGPL-3.0). It keeps GitHub repository traffic (views, clones, popular paths, referrers) beyond GitHub's 14-day limit and shows it with stars and releases as charts. Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui on Radix, Recharts and D3, Octokit with a GitHub App. Storage and sign-in are Supabase today (GitHub OAuth plus Postgres tables `views`, `clones`, `paths`, `referrers`).

## Architecture

- **Data sources:** GitHub returns only the last 14 days of traffic. A daily GitHub Actions job (`.github/workflows/cron.yaml` running `lib/cron.ts`) walks every GitHub App installation and upserts traffic into the database (`lib/update-traffic.ts`). Pages merge the stored history with the live GitHub API response (`lib/repo/*.ts`).
- **GitHub access:** the GitHub App (`lib/octokit/app.ts`, `APP_ID` and `APP_PRIVATE_KEY`) lists installations and repositories; the signed-in user's GitHub token (cookie `provider_token`, `lib/octokit/get-user-octokit.ts`) is used for per-user calls.
- **Auth:** `middleware.ts` redirects to `/signin` when there is no Supabase session (`lib/supabase/`).
- **Folders:** routes in `app/` (`(dashboard)` is the home grid, `[owner]` and `[owner]/[repo]` the dashboards, `star-history` the public star chart generator, `api/` the SVG and CSV export); shared components in `app/components/` (`charts`, `repo`, `layout`, `ui`); data fetching, GitHub and database code in `lib/`. `lib/shared/` is code adapted from Star History (MIT, see its license notice; keep it).
- **Never:** remove `LICENSE` or the Star History notice; commit secrets (`.env*` is ignored).

## UI Components

This project uses shadcn/ui components. If you need a component that's not currently installed, you can ask the user to install it using command like: `npx shadcn@latest add label`.

## Code Style Guidelines

When coding, only write comments when the code is extremely difficult to understand by just reading the code. Only add comments in cases where the logic is genuinely complex or non-obvious. Otherwise, write plain code without comments (following clean code methodology).

Never use the `any` type in TypeScript. Always use proper type definitions, interfaces, or union types to maintain type safety.
