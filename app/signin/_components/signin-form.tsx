"use client";

import { useActionState } from "react";
import { Loader } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { signInWithToken, type SignInState } from "@/app/signin/_lib/actions";

const initialState: SignInState = {};

export function SignInForm() {
  const [state, formAction, pending] = useActionState(
    signInWithToken,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Input
        type="password"
        name="token"
        autoComplete="current-password"
        aria-label="Site token"
        placeholder="Site token"
        required
      />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader className="animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}
