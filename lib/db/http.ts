import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { Db } from "./client";
import * as schema from "./schema";

export type D1Result = {
  results: Record<string, unknown>[];
  success: boolean;
  meta: Record<string, unknown>;
};

type D1Statement = { sql: string; params: unknown[] };

type D1Config = {
  accountId: string;
  databaseId: string;
  apiToken: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

type D1Response = {
  success: boolean;
  errors?: { code: number; message: string }[];
  result?: D1Result[];
};

const MAX_TRIES = 3;
const TIMEOUT_MS = 15000;
const BASE_DELAY_MS = 500;
const MAX_RETRY_AFTER_S = 30;
const RETRY_STATUSES = new Set([429, 502, 503, 504]);

class D1Error extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly waitMs?: number,
    readonly status?: number,
  ) {
    super(message);
  }
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function backoff(attempt: number) {
  return BASE_DELAY_MS * 2 ** attempt + Math.random() * BASE_DELAY_MS;
}

function parseRetryAfter(header: string | null) {
  const seconds = Number(header);
  return header !== null && Number.isFinite(seconds) ? seconds : undefined;
}

async function send(config: D1Config, body: string): Promise<D1Result[]> {
  const doFetch = config.fetch ?? fetch;
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
  let response: Response;
  try {
    response = await doFetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "request failed";
    throw new D1Error(`D1 request failed: ${reason}`, true);
  }

  const payload = (await response
    .json()
    .catch(() => null)) as D1Response | null;
  if (response.ok && payload?.success && payload.result) return payload.result;

  const message =
    payload?.errors?.map((e) => e.message).join("; ") ||
    `D1 request failed with status ${response.status}`;
  if (!RETRY_STATUSES.has(response.status)) {
    throw new D1Error(message, false, undefined, response.status);
  }
  const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
  if (retryAfter !== undefined && retryAfter > MAX_RETRY_AFTER_S) {
    throw new D1Error(message, false, undefined, response.status);
  }
  throw new D1Error(
    message,
    true,
    retryAfter === undefined ? undefined : retryAfter * 1000,
    response.status,
  );
}

export async function queryD1(
  config: D1Config,
  statements: D1Statement[],
): Promise<D1Result[]> {
  const body = JSON.stringify(
    statements.length === 1 ? statements[0] : { batch: statements },
  );
  const sleep = config.sleep ?? defaultSleep;

  for (let attempt = 0; ; attempt++) {
    const started = Date.now();
    try {
      return await send(config, body);
    } catch (error) {
      if (!(error instanceof D1Error)) throw error;
      console.error(
        `D1 query failed (status ${error.status ?? "none"}, try ${attempt + 1}/${MAX_TRIES}, ${Date.now() - started} ms): ${error.message}`,
      );
      if (!error.retryable || attempt + 1 >= MAX_TRIES) throw error;
      await sleep(error.waitMs ?? backoff(attempt));
    }
  }
}

type Method = "run" | "all" | "values" | "get";

function toRows(result: D1Result, method: Method) {
  const rows = result.results.map((row) => Object.values(row));
  if (method === "get") {
    // drizzle reads a missing row as undefined; an empty array would be mapped as a row
    return { rows: (rows[0] ?? undefined) as never };
  }
  return { rows };
}

export function createHttpDb(config: D1Config): Db {
  return drizzle(
    async (sql, params, method) => {
      const [result] = await queryD1(config, [{ sql, params }]);
      return toRows(result, method);
    },
    async (queries) => {
      const results = await queryD1(
        config,
        queries.map(({ sql, params }) => ({ sql, params })),
      );
      return results.map((result, i) => toRows(result, queries[i].method));
    },
    { schema },
  );
}
