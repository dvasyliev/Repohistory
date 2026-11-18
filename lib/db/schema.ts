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
