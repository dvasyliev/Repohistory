import { createHttpDb } from "./http";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export function createHttpDbFromEnv() {
  return createHttpDb({
    accountId: requireEnv("CLOUDFLARE_ACCOUNT_ID"),
    databaseId: requireEnv("D1_DATABASE_ID"),
    apiToken: requireEnv("D1_API_TOKEN"),
  });
}
