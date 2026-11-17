---
paths:
  - "src/**"
  - "app/**"
  - "lib/**"
---

# Libraries

When to use what the platform gives and when to reach for a library. The platform here means the browser, CSS, React, the framework and the server runtime.

## How to choose

Go through these in order and stop at the first that fits.

1. **Logic specific to this app** (its data rules, permissions, domain calculations): write it. No library knows it.
2. **The platform solves the whole job:** use it. It adds no dependency and no download.
3. **The platform solves only part of it, and the rest needs workaround code:** use a library.
4. **Generic logic is written, or is about to be written, more than once:** use a library, if the logic is hard to get right (focus, keyboard, positioning, rollback, caching, validation). If the repeat is a few simple lines, a shared helper is enough.

A job from a section below uses that section's choice. For a job not listed, ask the user before adding a library. A library must have a stable release at least two years old (or come from a team with that record), a release in the last six months, wide use, TypeScript types and support for the project's React version.

## Using a library

- When Context7 is not available, read the library's official docs.
- Add a library when the first code needs it.
- These rules are for new code. Do not rewrite old code to match them until the user asks for that specific rewrite. Then do it one library at a time.

## Components

**Platform:** a plain `<button>` for toggles, a native `<select>` for a short list of options.

**Library:** Radix for menus, popovers, windows, confirmations, radio groups, bottom panels and search suggestions. The platform covers only part of these: focus, keyboard navigation and positioning stay on you.

## Forms

**Platform:** a native `<form>`, enough for a few independent fields.

**Library:** React Hook Form, when a form has many fields, fields that depend on each other, fields added at runtime, or errors per field as the user types. It uses the same schema as the server.

## Validation

**Platform:** field attributes help the user; they protect nothing, as the server can get any request.

**Library:** Zod for data from outside the code: request bodies, server action arguments, query values. Do not check these by hand or cast them.

- Validate at the edge of a route or action; code behind it gets typed data and does not check again.
- Keep the library out of client code unless a form needs it, so the browser does not download it.
- Validate a third-party API's response only where a wrong answer would do real harm.

## URL state

**Platform:** `URLSearchParams` for building a one-off link or an address for a request.

**Library:** nuqs for filters and anything else that reads and changes the page's query parameters. Check that it works with the framework's caching before relying on it.

- Changes that wait for a button, such as Apply in a panel, stay in local state until it is pressed.

## Data

**Platform:** a single request from the browser with nothing shared or saved around it is a plain `fetch`.

**Library:** TanStack Query for data in the browser: next pages of a list, search suggestions, data shared by many components, and every write that shows at once. In an app without server rendering, for all server data.

- Do not write rollback by hand; a failed write puts the old data back through the library.
- Writes to one item run in order, so quick clicks cannot race.
- Do not fetch in `useEffect` when a query fits.

## Client state

**Platform:** the URL for what a link should keep, `useState` for one component, Context for a few components under one provider. Data from the server does not go in a hand-written store.

**Library:** Zustand, when state is shared by distant components and Context re-renders are measured as a real slowdown.

## Notifications

**Platform:** an error shows in place as `role="alert"`, through one shared component.

**Library:** Sonner, when a message must outlive the place it came from. Do not add a second toast library.

## Dates and numbers

**Platform:** `Intl` and `Date`.

**Library:** Day.js, only for calculations these cannot do, such as time zone arithmetic.

## Working on the platform alone

No library for these unless the rules above change:

- Lazy loading and "end of list in view": `IntersectionObserver`.
- Sideways rows: CSS scroll snap.
- A time limit on a request: `AbortSignal.timeout()`.
- Long lists that are slow to draw: `content-visibility: auto`, measured first.
