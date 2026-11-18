import { unstable_cache } from "next/cache";
import { cacheDay } from "@/lib/cache-day";

type KeyArg = string | number;

export function dailyCache<Args extends KeyArg[], Result>(
  name: string,
  fn: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  const cached = unstable_cache(
    (_day: string, ...args: Args) => fn(...args),
    [name],
    { revalidate: 86_400 },
  );
  return (...args: Args) => cached(cacheDay(), ...args);
}
