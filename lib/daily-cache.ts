import { cacheDay } from "@/lib/cache-day";

type KeyArg = string | number;

const CACHE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://repohistory.internal";

// Cloudflare's per-datacenter cache. It is missing in `next dev` and tests, and does nothing on workers.dev.
function edgeCache(): Cache | undefined {
  const storage = (globalThis as { caches?: { default?: Cache } }).caches;
  return storage?.default;
}

async function readCache<T>(cache: Cache, key: Request): Promise<T | null> {
  try {
    const hit = await cache.match(key);
    return hit ? ((await hit.json()) as T) : null;
  } catch (error) {
    console.error("edge cache read error", key.url, error);
    return null;
  }
}

async function writeCache(cache: Cache, key: Request, value: unknown) {
  try {
    await cache.put(
      key,
      new Response(JSON.stringify(value), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "max-age=86400",
        },
      }),
    );
  } catch (error) {
    console.error("edge cache write error", key.url, error);
  }
}

export function dailyCache<Args extends KeyArg[], Result>(
  name: string,
  fn: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return async (...args: Args) => {
    const cache = edgeCache();
    if (!cache) return fn(...args);

    const path = [name, cacheDay(), ...args]
      .map((part) => encodeURIComponent(String(part)))
      .join("/");
    const key = new Request(`${CACHE_ORIGIN}/__daily-cache/${path}`);
    const hit = await readCache<Result>(cache, key);
    if (hit !== null) return hit;

    const value = await fn(...args);
    await writeCache(cache, key, value);
    return value;
  };
}
