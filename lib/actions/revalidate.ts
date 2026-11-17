"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth/session";

export async function revalidatePage(path: string) {
  const cookieStore = await cookies();
  const signedIn = await isValidSession(
    cookieStore.get(SESSION_COOKIE)?.value,
    process.env.SITE_TOKEN ?? "",
  );
  if (!signedIn) return;
  revalidatePath(path, "page");
}
