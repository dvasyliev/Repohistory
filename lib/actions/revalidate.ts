"use server";

import { revalidatePath } from "next/cache";

// Server actions must be async functions.
// eslint-disable-next-line @typescript-eslint/require-await
export async function revalidatePage(path: string) {
  revalidatePath(path, "page");
}
