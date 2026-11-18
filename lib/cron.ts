import "@/lib/env-config";
import { createHttpDbFromEnv } from "@/lib/db/http-from-env";
import { createApp } from "@/lib/octokit/app";
import { updateTraffic } from "./update-traffic";

const app = createApp({ throttle: true });
const db = createHttpDbFromEnv();

await app.eachInstallation(async ({ installation }) => {
  if (installation.suspended_at) {
    return;
  }

  await updateTraffic(app, installation.id, db);
});
