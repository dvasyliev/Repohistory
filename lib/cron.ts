import '@/lib/env-config'
import { app } from '@/lib/octokit/app';
import { updateTraffic } from './update-traffic';

app.eachInstallation(({ installation }) => {
  if (installation.suspended_at) {
    return
  }

  updateTraffic(installation.id)
});
