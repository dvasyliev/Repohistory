import { cache } from "react";
import { App, Octokit } from "octokit";
import { timedFetch } from "./timed-fetch";

// One App per request: Workers reject promises shared across requests,
// and Octokit's throttling queue would otherwise outlive the request.
export const getApp = cache(
  (): App =>
    new App({
      appId: process.env.APP_ID!,
      // Env files keep the PEM key on one line with escaped newlines.
      privateKey: process.env.APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      Octokit: Octokit.defaults({ request: { fetch: timedFetch } }),
    }),
);
