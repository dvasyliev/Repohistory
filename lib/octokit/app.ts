import { cache } from "react";
import { App, Octokit } from "octokit";
import { timedFetch } from "./timed-fetch";

// Workers hang a request that awaits a promise from another request. So each
// request gets its own App, and throttling stays off: its Bottleneck queues
// are module-wide and shared by every Octokit instance.
export const getApp = cache(
  (): App =>
    new App({
      appId: process.env.APP_ID!,
      // Env files keep the PEM key on one line with escaped newlines.
      privateKey: process.env.APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      Octokit: Octokit.defaults({
        request: { fetch: timedFetch },
        throttle: { enabled: false },
      }),
    }),
);
