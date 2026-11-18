import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const views = sqliteTable(
  "views",
  {
    repoId: integer("repo_id").notNull(),
    date: text("date").notNull(),
    total: integer("total").notNull(),
    unique: integer("unique").notNull(),
  },
  (t) => [primaryKey({ columns: [t.repoId, t.date] })],
);

export const clones = sqliteTable(
  "clones",
  {
    repoId: integer("repo_id").notNull(),
    date: text("date").notNull(),
    total: integer("total").notNull(),
    unique: integer("unique").notNull(),
  },
  (t) => [primaryKey({ columns: [t.repoId, t.date] })],
);

export const paths = sqliteTable(
  "paths",
  {
    repoId: integer("repo_id").notNull(),
    path: text("path").notNull(),
    date: text("date").notNull(),
    total: integer("total").notNull(),
    unique: integer("unique"),
  },
  (t) => [primaryKey({ columns: [t.repoId, t.path, t.date] })],
);

export const referrers = sqliteTable(
  "referrers",
  {
    repoId: integer("repo_id").notNull(),
    referrer: text("referrer").notNull(),
    date: text("date").notNull(),
    total: integer("total").notNull(),
    unique: integer("unique"),
  },
  (t) => [primaryKey({ columns: [t.repoId, t.referrer, t.date] })],
);

export const stars = sqliteTable(
  "stars",
  {
    repoId: integer("repo_id").notNull(),
    date: text("date").notNull(),
    count: integer("count").notNull(),
  },
  (t) => [primaryKey({ columns: [t.repoId, t.date] })],
);

export const repoCounters = sqliteTable(
  "repo_counters",
  {
    repoId: integer("repo_id").notNull(),
    date: text("date").notNull(),
    stars: integer("stars").notNull(),
    forks: integer("forks").notNull(),
    watchers: integer("watchers").notNull(),
  },
  (t) => [primaryKey({ columns: [t.repoId, t.date] })],
);

export const forks = sqliteTable(
  "forks",
  {
    repoId: integer("repo_id").notNull(),
    date: text("date").notNull(),
    count: integer("count").notNull(),
  },
  (t) => [primaryKey({ columns: [t.repoId, t.date] })],
);

export const commitWeeks = sqliteTable(
  "commit_weeks",
  {
    repoId: integer("repo_id").notNull(),
    week: text("week").notNull(),
    commits: integer("commits").notNull(),
    additions: integer("additions").notNull(),
    deletions: integer("deletions").notNull(),
  },
  (t) => [primaryKey({ columns: [t.repoId, t.week] })],
);
