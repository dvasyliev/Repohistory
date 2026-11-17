import { cache } from "react";
import { notFound } from "next/navigation";
import type { Octokit } from "octokit";
import { getApp } from "./app";

const listInstallations = cache(async () => {
  const { data } = await getApp().octokit.rest.apps.listInstallations({
    per_page: 100,
  });
  return data;
});

export const getInstallationOctokit = cache(
  async (owner: string): Promise<Octokit> => {
    const installations = await listInstallations();
    const installation = installations.find(
      (item) =>
        item.suspended_at === null &&
        item.account !== null &&
        item.account.login.toLowerCase() === owner.toLowerCase(),
    );
    if (!installation) {
      notFound();
    }
    return getApp().getInstallationOctokit(installation.id);
  },
);
