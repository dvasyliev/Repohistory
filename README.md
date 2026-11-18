<div align="center">
  
![github-banner](https://github.com/user-attachments/assets/ed888af7-14fa-42cc-9695-2bc887b7531a)

Repohistory is an analytics tool for tracking GitHub repo traffic history longer than 14 days<br/>
**[repohistory.com »](https://repohistory.com)**

</div>
<br/>

## Motivation

GitHub limits access to only the past 14 days of your repo’s traffic data, making it hard to track long-term trends. Repohistory solves this by helping you save traffic data every day, starting from first sign-in. You can then explore full traffic history in a beautifully designed dashboard, allowing you to analyze trends and get insights over time.

## Features

- 📊 **Extended Data Tracking**: Track repo clones, views, referrers and popular pages data for more than 14 days.
- ✨ **Beautiful Visualization**: View your repo’s trends with clear, attractive charts.
- 📈 **Stars History**: Watch your repo’s star growth over time with customizable chart.

## Fork note

This fork differs from upstream:

- Runs on Cloudflare Workers (OpenNext) with a D1 database instead of Vercel and Supabase.
- Sign-in is one site token (`SITE_TOKEN`), not GitHub OAuth.
- GitHub is read through a private GitHub App installed on your account.
- A daily GitHub Actions job writes traffic into D1 over the Cloudflare REST API.

## Deploy to Cloudflare

1. Create a GitHub App (private, read-only): Administration (read), Contents (read), Metadata (read). Install it on your account. Note the App ID and download the private key.
2. Copy `.env.example` to `.env.local` and fill it. Make the token with `openssl rand -hex 32`. Write `APP_PRIVATE_KEY` on one line with `\n` for line breaks. `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_GITHUB_APP_SLUG` (your App slug, used by the "Add Repos" button) are read at build time, so set them before deploying.
3. Create the database: `npx wrangler d1 create repohistory`, then put its id in `wrangler.jsonc` and in `D1_DATABASE_ID`.
4. Apply migrations: `npm run db:migrate:remote` (`npm run db:migrate:local` for local dev).
5. Push the Worker secrets from `.env.local`: `npm run secrets:push` (or `npx wrangler secret put NAME` one by one).
6. Add the Actions secrets: `APP_ID`, `APP_PRIVATE_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `D1_API_TOKEN` (custom token, Account, D1, Edit only), `D1_DATABASE_ID`. For example `gh secret set APP_ID`.
7. Deploy: `npm run deploy`. The custom domain is set in `wrangler.jsonc`.
8. Optional, import older history from repohistory.com exports: put `views.csv`, `clones.csv`, `popular-content.csv` and `referrers.csv` in `imports/<folder>` (git-ignored), then run `npx tsx scripts/import-csv.ts --repo owner/name --dir imports/<folder>`.

Notes:

- Sign-in has no rate limit, so keep `SITE_TOKEN` long and random.
- The session cookie is `Secure`, so Safari drops it on `http://localhost`. Use Chrome or Firefox locally, or `npm run preview`.
- The Workers Free plan allows 10 ms CPU per request. If Error 1102 appears, switch to Workers Paid.

## Star History

[![Star History Chart](https://app.repohistory.com/api/svg?repo=repohistory/repohistory&background=0D1117&color=62C3F8)](https://app.repohistory.com/star-history)
