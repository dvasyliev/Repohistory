import "@/lib/env-config";
import { createHttpDb } from "@/lib/db/http";
import { getApp } from "@/lib/octokit/app";
import { updateTraffic } from "./update-traffic";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

const db = createHttpDb({
  accountId: requireEnv("CLOUDFLARE_ACCOUNT_ID"),
  databaseId: requireEnv("D1_DATABASE_ID"),
  apiToken: requireEnv("CLOUDFLARE_API_TOKEN"),
});

await getApp().eachInstallation(async ({ installation }) => {
  if (installation.suspended_at) {
    return;
  }

  await updateTraffic(installation.id, db);
});
