"use client";

import { useCallback, useState } from "react";
import { FilterBar } from "@/components/filter-bar";
import { SummaryCards } from "@/components/summary-cards";
import { LineupTable } from "@/components/lineup-table";
import type { LineupEntry } from "@/types/lineup";

export function PeriodClient({ entries }: { entries: LineupEntry[] }) {
  const [filtered, setFiltered] = useState<LineupEntry[]>(entries);

  const handleFilter = useCallback((f: LineupEntry[]) => {
    setFiltered(f);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <FilterBar entries={entries} onFilter={handleFilter} />
      <SummaryCards entries={filtered} />
      <LineupTable entries={filtered} />
    </div>
  );
}
