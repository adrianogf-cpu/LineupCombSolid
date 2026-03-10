"use client";

import { useCallback, useState } from "react";
import { FilterBar } from "@/components/filter-bar";
import { SummaryCards } from "@/components/summary-cards";
import { LineupTable } from "@/components/lineup-table";
import type { LineupEntry } from "@/types/lineup";

export function DashboardClient({ entries }: { entries: LineupEntry[] }) {
  const [filteredEntries, setFilteredEntries] = useState<LineupEntry[]>(entries);

  const handleFilter = useCallback((filtered: LineupEntry[]) => {
    setFilteredEntries(filtered);
  }, []);

  return (
    <div className="space-y-6">
      <FilterBar entries={entries} onFilter={handleFilter} />
      <SummaryCards entries={filteredEntries} />
      <LineupTable entries={filteredEntries} />
    </div>
  );
}
