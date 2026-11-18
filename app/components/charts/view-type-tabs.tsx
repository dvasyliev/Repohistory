import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

export type ViewType = "cumulative" | "daily";

interface ViewTypeTabsProps {
  value: ViewType;
  onChange: (value: ViewType) => void;
  isLoading?: boolean;
}

export function ViewTypeTabs({
  value,
  onChange,
  isLoading = false,
}: ViewTypeTabsProps) {
  const cursor = isLoading ? "cursor-not-allowed" : "cursor-pointer";
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as ViewType)}>
      <TabsList>
        <TabsTrigger value="daily" className={cursor}>
          Daily
        </TabsTrigger>
        <TabsTrigger value="cumulative" className={cursor}>
          Cumulative
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
