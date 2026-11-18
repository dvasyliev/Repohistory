import { parseAsStringLiteral } from "nuqs";
import { REPO_SORTS } from "./sort";

export const repoSortParser = parseAsStringLiteral(REPO_SORTS)
  .withDefault("views")
  .withOptions({ clearOnDefault: false });
