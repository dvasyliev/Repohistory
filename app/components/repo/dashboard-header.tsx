"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Button } from "@/app/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;

export function DashboardHeader() {
  const searchParams = useSearchParams();
  const viewMode = searchParams.get("view") === "owners" ? "owners" : "repos";

  const handleViewChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", value);
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between">
      <Tabs value={viewMode} onValueChange={handleViewChange}>
        <TabsList>
          <TabsTrigger value="repos">Repos</TabsTrigger>
          <TabsTrigger value="owners">Owners</TabsTrigger>
        </TabsList>
      </Tabs>
      {appSlug && (
        <Link
          href={`https://github.com/apps/${appSlug}/installations/new`}
          rel="noopener noreferrer"
        >
          <Button variant="secondary">
            <Plus className="h-4 w-4" />
            Add Repos
          </Button>
        </Link>
      )}
    </div>
  );
}
