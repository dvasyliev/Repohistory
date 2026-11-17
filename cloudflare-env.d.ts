interface CloudflareEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  WORKER_SELF_REFERENCE: Fetcher;
  SITE_TOKEN: string;
  APP_ID: string;
  APP_PRIVATE_KEY: string;
}
