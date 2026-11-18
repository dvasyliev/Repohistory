import { parseAsStringLiteral } from "nuqs";
import { REPO_SORTS } from "./sort";

export const repoSortParser = parseAsStringLiteral(REPO_SORTS)
  .withDefault("stars")
  .withOptions({ clearOnDefault: false });
