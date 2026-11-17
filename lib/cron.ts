import "@/lib/env-config";
import { app } from "@/lib/octokit/app";
import { updateTraffic } from "./update-traffic";

await app.eachInstallation(async ({ installation }) => {
  if (installation.suspended_at) {
    return;
  }

  await updateTraffic(installation.id);
});
