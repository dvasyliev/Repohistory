import { cache } from "react";
import { notFound } from "next/navigation";
import type { Octokit } from "octokit";
import { dailyCache } from "@/lib/daily-cache";
import { getApp } from "./app";

type Installation = { id: number; login: string };

const listInstallations = dailyCache(
  "github-installations",
  async (): Promise<Installation[]> => {
    const { data } = await getApp().octokit.rest.apps.listInstallations({
      per_page: 100,
    });
    return data.flatMap((item) =>
      item.suspended_at === null && item.account !== null
        ? [{ id: item.id, login: item.account.login }]
        : [],
    );
  },
);

export const getInstallationId = cache(
  async (owner: string): Promise<number> => {
    const installations = await listInstallations();
    const installation = installations.find(
      (item) => item.login.toLowerCase() === owner.toLowerCase(),
    );
    if (!installation) {
      notFound();
    }
    return installation.id;
  },
);

// Never share an Octokit across requests: build it per request from the plain installation id.
export const getOctokitForInstallation = cache(
  (installationId: number): Promise<Octokit> =>
    getApp().getInstallationOctokit(installationId),
);
