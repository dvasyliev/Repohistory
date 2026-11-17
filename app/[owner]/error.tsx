"use client";

import { useEffect } from "react";
import { Button } from "@/app/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p role="alert" className="text-sm text-muted-foreground">
        {error.message || "Something went wrong"}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
