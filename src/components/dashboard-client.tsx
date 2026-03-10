"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { FilterBar } from "@/components/filter-bar";
import { SummaryCards } from "@/components/summary-cards";
import { LineupTable } from "@/components/lineup-table";
import type { LineupEntry } from "@/types/lineup";

export function DashboardClient({ entries }: { entries: LineupEntry[] }) {
  const [filteredEntries, setFilteredEntries] = useState<LineupEntry[]>(entries);
  const router = useRouter();

  const handleFilter = useCallback((filtered: LineupEntry[]) => {
    setFilteredEntries(filtered);
  }, []);

  // Subscribe to Supabase Realtime for auto-refresh on new reports
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("lineup-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lineup_reports",
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="space-y-6">
      <FilterBar entries={entries} onFilter={handleFilter} />
      <SummaryCards entries={filteredEntries} />
      <LineupTable entries={filteredEntries} />
    </div>
  );
}
