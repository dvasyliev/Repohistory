"use client";

import { Component, startTransition, type ReactNode } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";

interface BoundaryProps {
  resetKey?: unknown;
  fallback: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
}

class Boundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  componentDidUpdate(previous: BoundaryProps) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    unstable_rethrow(error);
    return this.props.fallback(error, () => this.setState({ error: null }));
  }
}

interface ChartErrorBoundaryProps {
  name: string;
  compact?: boolean;
  resetKey?: unknown;
  children: ReactNode;
}

export function ChartErrorBoundary({
  name,
  compact = false,
  resetKey,
  children,
}: ChartErrorBoundaryProps) {
  const router = useRouter();

  const fallback = (error: Error, reset: () => void) =>
    compact ? (
      <span
        title={`Couldn't load ${name}: ${error.message}`}
        className="flex h-7 items-center text-xl font-bold text-destructive sm:text-2xl"
      >
        !
      </span>
    ) : (
      <Card className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center">
        <p role="alert" className="text-sm text-muted-foreground">
          Couldn&apos;t load {name}.
        </p>
        <Button
          variant="outline"
          onClick={() =>
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
        >
          Try again
        </Button>
      </Card>
    );

  return (
    <Boundary resetKey={resetKey} fallback={fallback}>
      {children}
    </Boundary>
  );
}
