import { StarHistoryForm } from "./components/star-history-form";
import { StarHistoryGenerator } from "./components/star-history-generator";
import { BackgroundCharts } from "./components/background-charts";
import type { Metadata } from "next";

interface PageProps {
  searchParams: Promise<{
    owner?: string;
    repo?: string;
  }>;
}

export const metadata: Metadata = {
  title: "GitHub Repo Star History Chart Generator | Repohistory",
  description:
    "Generate customizable star history charts for your GitHub repositories. Input the owner and repository name to visualize star growth over time. Perfect for showcasing project popularity in your README.",
};

export default async function StarHistoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const owner = params.owner || "";
  const repo = params.repo || "";
  const fullName = owner && repo ? `${owner}/${repo}` : "";

  if (!fullName) {
    return (
      <div className="relative z-10 flex h-dvh flex-col items-center justify-center space-y-8 px-2">
        <BackgroundCharts />
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">
            Star History Chart Generator
          </h1>
          <p className="text-muted-foreground">
            Create customizable star history charts for your GitHub repo
          </p>
        </div>
        <StarHistoryForm initialOwner={owner} initialRepo={repo} />
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Want to see more detail chart?{" "}
            <a
              href="https://repohistory.com"
              className="underline transition-colors hover:text-white"
            >
              Try Repohistory
            </a>
          </p>
        </div>
        <StarHistoryGenerator
          initialOwner={owner}
          initialRepo={repo}
          fullName={fullName}
        />
      </div>
    </div>
  );
}
