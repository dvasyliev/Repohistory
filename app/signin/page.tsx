import type { Metadata } from "next";
import Image from "next/image";
import { SignInForm } from "./_components/signin-form";

export const metadata: Metadata = {
  title: "Sign In | Repohistory",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md space-y-8 p-8">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <Image
              src="/icons/general.png"
              alt="Repohistory Logo"
              priority
              width={82}
              height={82}
            />
          </div>
          <h1 className="mb-2 text-xl font-medium text-foreground">
            Sign in to Repohistory
          </h1>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
