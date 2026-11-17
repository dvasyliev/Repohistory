// Sends the Worker's secrets from .env.local to Cloudflare. Other keys in the file stay local.
import { spawnSync } from "node:child_process";
import nextEnv from "@next/env";

const WORKER_SECRETS = ["SITE_TOKEN", "APP_ID", "APP_PRIVATE_KEY"];

nextEnv.loadEnvConfig(process.cwd(), false);

const missing = WORKER_SECRETS.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

const secrets = Object.fromEntries(
  WORKER_SECRETS.map((name) => [name, process.env[name]]),
);

const result = spawnSync("npx", ["wrangler", "secret", "bulk"], {
  input: JSON.stringify(secrets),
  stdio: ["pipe", "inherit", "inherit"],
});
process.exit(result.status ?? 1);
