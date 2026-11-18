"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangeContextType {
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  dateRange: DateRange;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(
  undefined,
);

interface DateRangeProviderProps {
  children: ReactNode;
  fullName: string;
}

function getStorageKey(fullName: string): string {
  return `dateRange_${fullName}`;
}

function loadFromLocalStorage(fullName: string): string {
  if (typeof window === "undefined") {
    return "28";
  }

  try {
    const key = getStorageKey(fullName);
    const stored = localStorage.getItem(key);
    return stored || "28";
  } catch (error) {
    console.error("Error loading date range from localStorage:", error);
    return "28";
  }
}

function saveToLocalStorage(fullName: string, selectedPeriod: string): void {
  if (typeof window === "undefined") return;

  try {
    const key = getStorageKey(fullName);
    localStorage.setItem(key, selectedPeriod);
  } catch (error) {
    console.error("Error saving date range to localStorage:", error);
  }
}

function calculateDateRangeFromPeriod(selectedPeriod: string): DateRange {
  if (selectedPeriod === "all") {
    return { from: null, to: null };
  }

  const days = parseInt(selectedPeriod);
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from, to };
}

export function DateRangeProvider({
  children,
  fullName,
}: DateRangeProviderProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("28");

  useEffect(() => {
    const period = loadFromLocalStorage(fullName);
    // localStorage exists only in the browser, so it is read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedPeriod(period);
  }, [fullName]);

  const handleSetSelectedPeriod = useCallback(
    (period: string) => {
      setSelectedPeriod(period);
      saveToLocalStorage(fullName, period);
    },
    [fullName],
  );

  const dateRange = useMemo(
    () => calculateDateRangeFromPeriod(selectedPeriod),
    [selectedPeriod],
  );

  const value = useMemo(
    () => ({
      selectedPeriod,
      setSelectedPeriod: handleSetSelectedPeriod,
      dateRange,
    }),
    [selectedPeriod, handleSetSelectedPeriod, dateRange],
  );

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error("useDateRange must be used within a DateRangeProvider");
  }
  return context;
}
