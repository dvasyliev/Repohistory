import "@/lib/env-config";
import { createHttpDbFromEnv } from "@/lib/db/http-from-env";
import { getApp } from "@/lib/octokit/app";
import { updateTraffic } from "./update-traffic";

const db = createHttpDbFromEnv();

await getApp().eachInstallation(async ({ installation }) => {
  if (installation.suspended_at) {
    return;
  }

  await updateTraffic(installation.id, db);
});
