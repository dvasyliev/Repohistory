"use client";

import { useEffect } from "react";
import { signout } from "@/lib/actions/auth";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
    void signout();
  }, [error]);

  return null;
}
