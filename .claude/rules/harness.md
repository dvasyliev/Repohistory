# Harness

Written by the frontend-harness plugin from `.claude/harness.json`; do not edit by hand.

Harness modules: core, feature-workflow, context-size, eslint, knip, jscpd, tailwind, unit, e2e, commitlint, pre-commit, sync-deps, best-practices, context7, libraries, resilience, page-speed. Specs and plans are written in English.

## Commands

```bash
npm run dev             # http://localhost:3474
npm run typecheck       # TypeScript, after regenerating Next.js route types; never `tsc --noEmit`
npm run format          # Prettier, whole repo
npm run format:check    # Prettier check only
npm run format:file     # Prettier on one file (used by the edit hook)
npm run check           # all checks at once, as the Stop hook runs them
npm run lint            # ESLint, no warnings allowed
npm run lint:file       # ESLint on one file (used by the edit hook)
npm run knip            # unused files, exports and dependencies
npm run dupes           # duplicated code (jscpd)
npm run test            # all unit tests (Vitest); `npx vitest run <file>` for one
npm run verify          # all end-to-end tests; `npx playwright test <file>` for one
npm run prepare         # turns on the git hooks in .githooks/ (npm runs it on install)
```
