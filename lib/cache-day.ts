const HOUR_MS = 60 * 60 * 1000;

// The daily cron fills D1 at 00:00 UTC, so the cached GitHub reads reset an hour later.
export function cacheDay(now: Date = new Date()): string {
  return new Date(now.getTime() - HOUR_MS).toISOString().slice(0, 10);
}
