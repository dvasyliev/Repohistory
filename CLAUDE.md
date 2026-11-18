# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Repohistory is a personal fork of the open-source Repohistory dashboard (AGPL-3.0). It keeps GitHub repository traffic (views, clones, popular paths, referrers) beyond GitHub's 14-day limit and shows it with stars and releases as charts. Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui on Radix, Recharts and D3, Octokit with a private GitHub App. It runs on Cloudflare Workers through OpenNext, with D1 (SQLite) and Drizzle for storage.

## Architecture

- **Hosting:** `@opennextjs/cloudflare` builds the Worker (`npm run preview`, `npm run deploy`; config in `wrangler.jsonc`, `open-next.config.ts`). The D1 database `repohistory` is the `DB` binding; schema in `lib/db/schema.ts`, migrations in `drizzle/` (`npm run db:generate`, `db:migrate:local`, `db:migrate:remote`). Free plan: 10 ms CPU; Error 1102 means Workers Paid is needed.
- **Data sources:** GitHub returns only the last 14 days of traffic. A daily GitHub Actions job (`.github/workflows/cron.yaml` running `lib/cron.ts`) walks every GitHub App installation and upserts traffic into D1 over the Cloudflare REST API (`lib/db/http.ts`, `lib/update-traffic.ts`). Pages merge the stored history with the live GitHub API response (`lib/repo/*.ts`).
- **GitHub access:** one private GitHub App (`lib/octokit/app.ts`, `APP_ID` and `APP_PRIVATE_KEY`, read-only: Administration, Contents, Metadata). `lib/octokit/installation.ts` finds the installation for an owner and returns its Octokit; there is no per-user GitHub token.
- **Auth:** one site token (`SITE_TOKEN`). `middleware.ts` redirects to `/signin` without a valid session cookie; the cookie logic is in `lib/auth/`, public paths in `lib/auth/public-paths.ts`.
- **Environment:** local secrets live in `.env.local`; `.env.example` lists the names. `npm run secrets:push` sends the Worker secrets to Cloudflare. `NEXT_PUBLIC_SITE_URL` is read at build time. Actions secrets: `APP_ID`, `APP_PRIVATE_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `D1_API_TOKEN`, `D1_DATABASE_ID`.
- **CSV import:** `npx tsx scripts/import-csv.ts --repo owner/name --dir imports/<folder>` loads repohistory.com exports (`imports/` is git-ignored).
- **Folders:** routes in `app/` (`(dashboard)` is the home grid, `[owner]` and `[owner]/[repo]` the dashboards, `star-history` the public star chart generator, `api/` the SVG and CSV export); shared components in `app/components/` (`charts`, `repo`, `layout`, `ui`); data fetching, GitHub and database code in `lib/`. `lib/shared/` is code adapted from Star History (MIT, see its license notice; keep it).
- **Never:** remove `LICENSE` or the Star History notice; commit secrets (`.env*` is ignored, except `.env.example`).

## UI Components

This project uses shadcn/ui components. If you need a component that's not currently installed, you can ask the user to install it using command like: `npx shadcn@latest add label`.

## Code Style Guidelines

When coding, only write comments when the code is extremely difficult to understand by just reading the code. Only add comments in cases where the logic is genuinely complex or non-obvious. Otherwise, write plain code without comments (following clean code methodology).

Never use the `any` type in TypeScript. Always use proper type definitions, interfaces, or union types to maintain type safety.
