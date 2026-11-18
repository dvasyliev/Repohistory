const PAGE_TIMEOUT_MS = 4_000;
const MAX_TRIES = 2;
const MAX_RETRY_AFTER_MS = 5_000;
const BASE_BACKOFF_MS = 500;
const MAX_JITTER_MS = 250;
const RETRY_STATUSES = new Set([429, 502, 503, 504]);

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const backoff = (attempt: number) =>
  2 ** attempt * BASE_BACKOFF_MS + Math.random() * MAX_JITTER_MS;

function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (header === null) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function retryWait(response: Response, attempt: number): number | null {
  if (!RETRY_STATUSES.has(response.status)) return null;
  const retryAfter = retryAfterMs(response);
  if (retryAfter === null) return backoff(attempt);
  return retryAfter > MAX_RETRY_AFTER_MS ? null : retryAfter;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  const method =
    init?.method ?? (input instanceof Request ? input.method : "GET");
  return method.toUpperCase();
}

async function fetchOnce(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  const target = new URL(
    input instanceof Request ? input.url : input.toString(),
  );
  const started = Date.now();
  try {
    const response = await fetch(input, { ...init, signal });
    if (!response.ok) {
      console.error(
        `GitHub ${response.status} ${target.pathname} after ${Date.now() - started}ms`,
      );
    }
    return response;
  } catch (error) {
    console.error(
      `GitHub request failed ${target.pathname} after ${Date.now() - started}ms`,
      error instanceof Error ? error.name : error,
    );
    throw error;
  }
}

export async function timedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = PAGE_TIMEOUT_MS,
): Promise<Response> {
  const tries = requestMethod(input, init) === "GET" ? MAX_TRIES : 1;
  for (let attempt = 0; ; attempt += 1) {
    const isLast = attempt === tries - 1;
    let response: Response;
    try {
      response = await fetchOnce(input, init, timeoutMs);
    } catch (error) {
      if (isLast || !(error instanceof TypeError)) throw error;
      await delay(backoff(attempt));
      continue;
    }
    const wait = isLast ? null : retryWait(response, attempt);
    if (wait === null) return response;
    await response.body?.cancel();
    await delay(wait);
  }
}
