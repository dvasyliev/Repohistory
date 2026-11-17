import "@/lib/env-config";
import { getApp } from "@/lib/octokit/app";
import { updateTraffic } from "./update-traffic";

await getApp().eachInstallation(async ({ installation }) => {
  if (installation.suspended_at) {
    return;
  }

  await updateTraffic(installation.id);
});
