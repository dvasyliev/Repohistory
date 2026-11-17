import { App } from "octokit";

let app: App | undefined;

export function getApp(): App {
  app ??= new App({
    appId: process.env.APP_ID!,
    // Env files keep the PEM key on one line with escaped newlines.
    privateKey: process.env.APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  });
  return app;
}
