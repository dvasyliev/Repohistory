export function hasNonZero<K extends string>(
  rows: readonly Partial<Record<K, unknown>>[],
  keys: readonly K[],
): boolean {
  return rows.some((row) =>
    keys.some((key) => {
      const value = row[key];
      return typeof value === "number" && value > 0;
    }),
  );
}

export function emptyChartMessage(
  dataType: string,
  hasAnyData: boolean,
  selectedPeriod: string,
): string {
  if (!hasAnyData || selectedPeriod === "all") return `No ${dataType} yet`;
  return `No ${dataType} in the last ${selectedPeriod} days`;
}
