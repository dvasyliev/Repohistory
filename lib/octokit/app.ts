import { App } from "octokit";

let app: App | undefined;

export function getApp(): App {
  app ??= new App({
    appId: process.env.APP_ID!,
    privateKey: process.env.APP_PRIVATE_KEY!,
  });
  return app;
}
