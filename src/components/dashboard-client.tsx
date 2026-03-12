"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { FilterBar } from "@/components/filter-bar";
import { SummaryCards } from "@/components/summary-cards";
import { LineupTable } from "@/components/lineup-table";
import { DiffToggle } from "@/components/diff-toggle";
import type { LineupEntry } from "@/types/lineup";
import type { DiffEntry } from "@/types/diff";

interface DashboardClientProps {
  entries: LineupEntry[];
  diffEntries?: DiffEntry[] | null;
  isDiffMode?: boolean;
  showMinor?: boolean;
  compareDate?: string | null;
  availableDates?: string[];
  reportDate?: string;
}

export function DashboardClient({
  entries,
  diffEntries,
  isDiffMode = false,
  showMinor = false,
}: DashboardClientProps) {
  const [filteredEntries, setFilteredEntries] = useState<LineupEntry[]>(entries);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleFilter = useCallback((filtered: LineupEntry[]) => {
    setFilteredEntries(filtered);
  }, []);

  // Diff URL state handlers
  const handleToggleDiff = useCallback(
    (enabled: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (enabled) {
        params.set("diff", "1");
      } else {
        params.delete("diff");
        params.delete("minor");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const handleToggleMinor = useCallback(
    (enabled: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (enabled) {
        params.set("minor", "1");
      } else {
        params.delete("minor");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  // Filter minor shifts from diff entries
  const filteredDiffEntries = useMemo(() => {
    if (!diffEntries) return null;
    if (showMinor) return diffEntries;
    return diffEntries.filter((e) => {
      if (e.diff_status === "CHANGED") {
        const absShift = Math.abs(e.eta_shifted_days ?? 0);
        if (absShift > 0 && absShift <= 3 && (!e.fields_changed || e.fields_changed.length <= 1)) {
          return false;
        }
      }
      return true;
    });
  }, [diffEntries, showMinor]);

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
    <div className="space-y-4 sm:space-y-6">
      <FilterBar entries={entries} onFilter={handleFilter} />
      <DiffToggle
        isDiffMode={isDiffMode}
        showMinor={showMinor}
        onToggleDiff={handleToggleDiff}
        onToggleMinor={handleToggleMinor}
        diffEntries={filteredDiffEntries ?? null}
      />
      <SummaryCards entries={filteredEntries} />
      <LineupTable
        entries={filteredEntries}
        diffEntries={filteredDiffEntries}
        isDiffMode={isDiffMode}
      />
    </div>
  );
}
