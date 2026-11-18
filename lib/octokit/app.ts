import { cache } from "react";
import { App, Octokit } from "octokit";
import { timedFetch } from "./timed-fetch";

const CRON_TIMEOUT_MS = 10_000;

const cronFetch = (input: RequestInfo | URL, init?: RequestInit) =>
  timedFetch(input, init, CRON_TIMEOUT_MS);

const RETRY_ONCE = (
  _retryAfter: number,
  _options: unknown,
  _octokit: unknown,
  retryCount: number,
) => retryCount === 0;

export function createApp({ throttle }: { throttle: boolean }): App {
  return new App({
    appId: process.env.APP_ID!,
    // Env files keep the PEM key on one line with escaped newlines.
    privateKey: process.env.APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    Octokit: Octokit.defaults({
      request: { fetch: throttle ? cronFetch : timedFetch },
      retry: { enabled: false },
      throttle: throttle
        ? { onRateLimit: RETRY_ONCE, onSecondaryRateLimit: RETRY_ONCE }
        : { enabled: false },
    }),
  });
}

// Workers hang a request that awaits a promise from another request. So each
// request gets its own App, and throttling stays off: its Bottleneck queues
// are module-wide and shared by every Octokit instance. The daily job runs in
// Node, where that sharing is harmless, so it turns throttling on.
export const getApp = cache((): App => createApp({ throttle: false }));
