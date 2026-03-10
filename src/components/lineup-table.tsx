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
import type { LineupEntry } from "@/types/lineup";

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
}

const COLUMNS: ColumnDef[] = [
  { key: "vessel_name_canonical", label: "Navio" },
  { key: "porto_cidade", label: "Porto" },
  { key: "porto_terminal", label: "Terminal" },
  { key: "eta", label: "ETA" },
  { key: "etb", label: "ETB" },
  { key: "ets", label: "ETS" },
  { key: "op", label: "OP" },
  { key: "quantidade", label: "Qtd", className: "text-right" },
  { key: "carga", label: "Carga" },
  { key: "origem", label: "Origem" },
  { key: "destino", label: "Destino" },
  { key: "afretador", label: "Afretador" },
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

export function LineupTable({ entries }: { entries: LineupEntry[] }) {
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

  const sortedEntries = useMemo(() => {
    if (!sortColumn || !sortDirection) return entries;
    return [...entries].sort((a, b) =>
      compareValues(a, b, sortColumn, sortDirection)
    );
  }, [entries, sortColumn, sortDirection]);

  return (
    <div className="overflow-x-auto rounded-md border" style={{ WebkitOverflowScrolling: "touch" }}>
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col, idx) => (
              <TableHead
                key={col.key}
                className={`cursor-pointer select-none text-xs sm:text-sm ${
                  idx === 0 ? "sticky left-0 z-10 bg-background" : ""
                } ${DATE_COLUMNS.has(col.key) || NUMBER_COLUMNS.has(col.key) ? "whitespace-nowrap" : ""} ${col.className ?? ""}`}
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
          {sortedEntries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="sticky left-0 z-10 bg-background text-xs font-medium sm:text-sm">
                {entry.vessel_name_canonical ?? entry.vessel_name_raw}
              </TableCell>
              <TableCell className="text-xs sm:text-sm">{entry.porto_cidade ?? "-"}</TableCell>
              <TableCell className="text-xs sm:text-sm">{entry.porto_terminal ?? "-"}</TableCell>
              <TableCell className="whitespace-nowrap text-xs sm:text-sm">{formatDateShort(entry.eta)}</TableCell>
              <TableCell className="whitespace-nowrap text-xs sm:text-sm">{formatDateShort(entry.etb)}</TableCell>
              <TableCell className="whitespace-nowrap text-xs sm:text-sm">{formatDateShort(entry.ets)}</TableCell>
              <TableCell className="text-xs sm:text-sm">
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
              <TableCell className="whitespace-nowrap text-right text-xs sm:text-sm">
                {formatQuantidade(entry.quantidade)}
              </TableCell>
              <TableCell className="text-xs sm:text-sm">{entry.carga ?? "-"}</TableCell>
              <TableCell className="text-xs sm:text-sm">{entry.origem ?? "-"}</TableCell>
              <TableCell className="text-xs sm:text-sm">{entry.destino ?? "-"}</TableCell>
              <TableCell className="text-xs sm:text-sm">{entry.afretador ?? "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
