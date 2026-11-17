import "@/lib/env-config";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { parseDailyCsv, parseWideCsv } from "@/lib/csv-history";
import { createHttpDbFromEnv } from "@/lib/db/http-from-env";
import { getApp } from "@/lib/octokit/app";
import { upsertTraffic } from "@/lib/traffic-rows";

const { values } = parseArgs({
  options: { repo: { type: "string" }, dir: { type: "string" } },
});
const [owner, name] = (values.repo ?? "").split("/");
if (!owner || !name || !values.dir) {
  console.error("Usage: import-csv.ts --repo owner/name --dir path");
  process.exit(1);
}
const dir = values.dir;

async function readCsv(file: string): Promise<string | null> {
  const path = join(dir, file);
  if (!existsSync(path)) {
    console.log(`${file}: not found, skipped`);
    return null;
  }
  return readFile(path, "utf8");
}

const app = getApp();
const { data: installation } = await app.octokit.rest.apps.getUserInstallation({
  username: owner,
});
const octokit = await app.getInstallationOctokit(installation.id);
const { data: repo } = await octokit.rest.repos.get({ owner, repo: name });
const repoId = Number(repo.id);

const [viewsCsv, clonesCsv, pathsCsv, referrersCsv] = await Promise.all([
  readCsv("views.csv"),
  readCsv("clones.csv"),
  readCsv("popular-content.csv"),
  readCsv("referrers.csv"),
]);

const rows = {
  views: viewsCsv ? parseDailyCsv(viewsCsv, repoId) : [],
  clones: clonesCsv ? parseDailyCsv(clonesCsv, repoId) : [],
  paths: pathsCsv ? parseWideCsv(pathsCsv, repoId, "paths") : [],
  referrers: referrersCsv ? parseWideCsv(referrersCsv, repoId, "referrers") : [],
};

await upsertTraffic(createHttpDbFromEnv(), rows);

for (const [table, tableRows] of Object.entries(rows)) {
  console.log(`${table}: ${tableRows.length} rows`);
}
