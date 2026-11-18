import type { DailyRow, PathRow, ReferrerRow } from "@/lib/traffic-rows";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(date: string, line: number): string {
  if (!ISO_DATE.test(date)) {
    throw new Error(`Invalid date "${date}" on line ${line}`);
  }
  return date;
}

function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records.filter((r) => r.some((cell) => cell !== ""));
}

export function parseDailyCsv(text: string, repoId: number): DailyRow[] {
  const [, ...records] = parseCsv(text);
  return records.map(([date, total, unique], index) => ({
    repoId,
    date: assertDate(date, index + 2),
    total: Number(total),
    unique: Number(unique),
  }));
}

export function parseWideCsv(
  text: string,
  repoId: number,
  kind: "paths",
): PathRow[];
export function parseWideCsv(
  text: string,
  repoId: number,
  kind: "referrers",
): ReferrerRow[];
export function parseWideCsv(
  text: string,
  repoId: number,
  kind: "paths" | "referrers",
): PathRow[] | ReferrerRow[] {
  const [header, ...records] = parseCsv(text);
  const cells: { name: string; date: string; total: number }[] = [];
  for (const [index, [date, ...values]] of records.entries()) {
    assertDate(date, index + 2);
    values.forEach((value, i) => {
      const total = Number(value);
      if (total !== 0) cells.push({ name: header[i + 1], date, total });
    });
  }
  if (kind === "paths") {
    return cells.map(({ name, date, total }) => ({
      repoId,
      path: name,
      date,
      total,
      unique: null,
    }));
  }
  return cells.map(({ name, date, total }) => ({
    repoId,
    referrer: name,
    date,
    total,
    unique: null,
  }));
}
