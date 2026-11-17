"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sessionValue,
  verifyToken,
} from "@/lib/auth/session";

const schema = z.object({ token: z.string().min(1) });

export interface SignInState {
  error?: string;
}

export async function signInWithToken(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = schema.safeParse({ token: formData.get("token") });
  const siteToken = process.env.SITE_TOKEN ?? "";

  if (!parsed.success || !(await verifyToken(parsed.data.token, siteToken))) {
    return { error: "Wrong token" };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await sessionValue(siteToken), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/");
}
