"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LineupEntry } from "@/types/lineup";
import type { DiffEntry } from "@/types/diff";
import { diffRowClass, diffCellClass } from "@/types/diff";

type SortDirection = "asc" | "desc" | null;
type SortColumn = keyof LineupEntry | null;

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T12:00:00Z");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function formatQuantidade(qty: number | null): string {
  if (qty === null || qty === undefined) return "-";
  return qty.toLocaleString("pt-BR");
}

const DATE_COLUMNS: Set<string> = new Set(["eta", "etb", "ets"]);
const NUMBER_COLUMNS: Set<string> = new Set(["quantidade"]);

function compareValues(
  a: LineupEntry,
  b: LineupEntry,
  column: keyof LineupEntry,
  direction: "asc" | "desc"
): number {
  const aVal = a[column];
  const bVal = b[column];

  // Nulls always last regardless of direction
  if (aVal === null && bVal === null) return 0;
  if (aVal === null) return 1;
  if (bVal === null) return -1;

  let result = 0;

  if (DATE_COLUMNS.has(column)) {
    result = new Date(aVal as string).getTime() - new Date(bVal as string).getTime();
  } else if (NUMBER_COLUMNS.has(column)) {
    result = (aVal as number) - (bVal as number);
  } else {
    result = String(aVal).localeCompare(String(bVal), "pt-BR", {
      sensitivity: "base",
    });
  }

  return direction === "desc" ? -result : result;
}

interface ColumnDef {
  key: keyof LineupEntry;
  label: string;
  className?: string;
  hideOnMobile?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "vessel_name_canonical", label: "Navio" },
  { key: "porto_cidade", label: "Porto" },
  { key: "porto_terminal", label: "Terminal", hideOnMobile: true },
  { key: "eta", label: "ETA" },
  { key: "etb", label: "ETB", hideOnMobile: true },
  { key: "ets", label: "ETS", hideOnMobile: true },
  { key: "op", label: "OP" },
  { key: "quantidade", label: "Qtd", className: "text-right", hideOnMobile: true },
  { key: "carga", label: "Carga" },
  { key: "origem", label: "Origem", hideOnMobile: true },
  { key: "destino", label: "Destino", hideOnMobile: true },
  { key: "afretador", label: "Afretador", hideOnMobile: true },
];

function SortIcon({ column, sortColumn, sortDirection }: {
  column: string;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}) {
  if (sortColumn !== column || sortDirection === null) {
    return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground" />;
  }
  if (sortDirection === "asc") {
    return <ArrowUp className="ml-1 inline h-3 w-3" />;
  }
  return <ArrowDown className="ml-1 inline h-3 w-3" />;
}

function EtaShiftBadge({ days }: { days: number | null }) {
  if (!days || days === 0) return null;
  const label = days > 0 ? `+${days}d` : `${days}d`;
  const color = days > 0 ? "text-red-600" : "text-green-600";
  return <span className={`ml-1 text-[10px] font-semibold ${color}`}>({label})</span>;
}

interface LineupTableProps {
  entries: LineupEntry[];
  diffEntries?: DiffEntry[] | null;
  isDiffMode?: boolean;
}

export function LineupTable({ entries, diffEntries, isDiffMode }: LineupTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  function handleSort(column: keyof LineupEntry) {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
  }

  // Use diff entries as data source when in diff mode
  const displayData = useMemo(() => {
    if (isDiffMode && diffEntries && diffEntries.length > 0) {
      return diffEntries as unknown as LineupEntry[];
    }
    return entries;
  }, [isDiffMode, diffEntries, entries]);

  const sortedEntries = useMemo(() => {
    if (!sortColumn || !sortDirection) return displayData;
    return [...displayData].sort((a, b) =>
      compareValues(a, b, sortColumn, sortDirection)
    );
  }, [displayData, sortColumn, sortDirection]);

  // Helper to get diff entry for current row
  const getDiffEntry = (entry: LineupEntry): DiffEntry | undefined => {
    if (!isDiffMode || !diffEntries) return undefined;
    return entry as unknown as DiffEntry;
  };

  return (
    <div className="overflow-x-auto rounded-md border" style={{ WebkitOverflowScrolling: "touch" }}>
      {isDiffMode && diffEntries && (
        <div className="flex gap-4 border-b px-4 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-green-200 dark:bg-green-900" /> Novo
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-red-200 dark:bg-red-900" /> Removido
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-yellow-200 dark:bg-yellow-900" /> Campo alterado
          </span>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col, idx) => (
              <TableHead
                key={col.key}
                className={cn(
                  "cursor-pointer select-none text-xs sm:text-sm",
                  idx === 0 && "sticky left-0 z-10 bg-background",
                  (DATE_COLUMNS.has(col.key) || NUMBER_COLUMNS.has(col.key)) && "whitespace-nowrap",
                  col.hideOnMobile && "hidden sm:table-cell",
                  col.className
                )}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                <SortIcon
                  column={col.key}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEntries.map((entry, rowIdx) => {
            const diff = getDiffEntry(entry);
            return (
              <TableRow
                key={entry.id ?? `diff-${rowIdx}`}
                className={cn(isDiffMode && diff && diffRowClass(diff.diff_status))}
              >
                <TableCell className={cn(
                  "sticky left-0 z-10 bg-background text-xs font-medium sm:text-sm",
                  isDiffMode && diff && diffCellClass("vessel_name_canonical", diff.fields_changed)
                )}>
                  {entry.vessel_name_canonical ?? entry.vessel_name_raw}
                  {isDiffMode && diff?.diff_status === "REMOVED" && (
                    <Badge variant="outline" className="ml-1 text-[10px] border-red-300 text-red-600">saiu</Badge>
                  )}
                  {isDiffMode && diff?.diff_status === "ADDED" && (
                    <Badge variant="outline" className="ml-1 text-[10px] border-green-300 text-green-600">novo</Badge>
                  )}
                </TableCell>
                <TableCell className={cn("text-xs sm:text-sm", isDiffMode && diff && diffCellClass("porto_cidade", diff.fields_changed))}>
                  {entry.porto_cidade ?? "-"}
                </TableCell>
                <TableCell className={cn("hidden sm:table-cell text-xs sm:text-sm", isDiffMode && diff && diffCellClass("porto_terminal", diff.fields_changed))}>
                  {entry.porto_terminal ?? "-"}
                </TableCell>
                <TableCell className={cn("whitespace-nowrap text-xs sm:text-sm", isDiffMode && diff && diffCellClass("eta", diff.fields_changed))}>
                  {formatDateShort(entry.eta)}
                  {isDiffMode && diff && <EtaShiftBadge days={diff.eta_shifted_days} />}
                </TableCell>
                <TableCell className={cn("hidden sm:table-cell whitespace-nowrap text-xs sm:text-sm", isDiffMode && diff && diffCellClass("etb", diff.fields_changed))}>
                  {formatDateShort(entry.etb)}
                </TableCell>
                <TableCell className={cn("hidden sm:table-cell whitespace-nowrap text-xs sm:text-sm", isDiffMode && diff && diffCellClass("ets", diff.fields_changed))}>
                  {formatDateShort(entry.ets)}
                </TableCell>
                <TableCell className={cn("text-xs sm:text-sm", isDiffMode && diff && diffCellClass("op", diff.fields_changed))}>
                  {entry.op ? (
                    <Badge
                      className={
                        entry.op.toUpperCase() === "L"
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : entry.op.toUpperCase() === "D"
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : ""
                      }
                    >
                      {entry.op.toUpperCase()}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className={cn("hidden sm:table-cell whitespace-nowrap text-right text-xs sm:text-sm", isDiffMode && diff && diffCellClass("quantidade", diff.fields_changed))}>
                  {formatQuantidade(entry.quantidade)}
                </TableCell>
                <TableCell className={cn("text-xs sm:text-sm", isDiffMode && diff && diffCellClass("carga", diff.fields_changed))}>
                  {entry.carga ?? "-"}
                </TableCell>
                <TableCell className={cn("hidden sm:table-cell text-xs sm:text-sm", isDiffMode && diff && diffCellClass("origem", diff.fields_changed))}>
                  {entry.origem ?? "-"}
                </TableCell>
                <TableCell className={cn("hidden sm:table-cell text-xs sm:text-sm", isDiffMode && diff && diffCellClass("destino", diff.fields_changed))}>
                  {entry.destino ?? "-"}
                </TableCell>
                <TableCell className={cn("hidden sm:table-cell text-xs sm:text-sm", isDiffMode && diff && diffCellClass("afretador", diff.fields_changed))}>
                  {entry.afretador ?? "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
