const GITHUB_TIMEOUT_MS = 10_000;

export async function timedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = GITHUB_TIMEOUT_MS,
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
