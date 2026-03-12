'use client';

import { useState, useMemo } from 'react';
import type { VesselTimelineRow } from '@/types/analytics';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatQty(qty: number | null): string {
  if (qty == null) return '-';
  return qty.toLocaleString('pt-BR');
}

const columns: ColumnDef<VesselTimelineRow>[] = [
  {
    accessorKey: 'report_date',
    header: 'Semana',
    cell: ({ getValue }) => formatDate(getValue<string>()),
  },
  {
    accessorKey: 'vessel_name_canonical',
    header: 'Navio',
  },
  {
    accessorKey: 'porto_cidade',
    header: 'Porto',
    cell: ({ getValue }) => getValue<string | null>() ?? '-',
    filterFn: 'includesString',
  },
  {
    accessorKey: 'carga',
    header: 'Carga',
    cell: ({ getValue }) => getValue<string | null>() ?? '-',
  },
  {
    accessorKey: 'quantidade',
    header: 'Qtd',
    cell: ({ getValue }) => formatQty(getValue<number | null>()),
  },
  {
    accessorKey: 'op',
    header: 'OP',
    cell: ({ getValue }) => {
      const op = getValue<string | null>();
      if (!op) return '-';
      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            op === 'L'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : op === 'D'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          {op}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: 'afretador',
    header: 'Afretador',
    cell: ({ getValue }) => getValue<string | null>() ?? '-',
  },
];

interface AfretadorDataTableProps {
  data: VesselTimelineRow[];
  afretadorName: string;
}

export function AfretadorDataTable({
  data,
  afretadorName,
}: AfretadorDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [portFilter, setPortFilter] = useState('');

  const stats = useMemo(() => {
    const uniqueVessels = new Set(data.map((r) => r.vessel_name_canonical));
    const uniquePorts = new Set(
      data.map((r) => r.porto_cidade).filter(Boolean)
    );

    // Most common cargo
    const cargoCount = new Map<string, number>();
    for (const row of data) {
      if (row.carga) {
        cargoCount.set(row.carga, (cargoCount.get(row.carga) ?? 0) + 1);
      }
    }
    let topCargo = '-';
    let topCount = 0;
    for (const [cargo, count] of cargoCount) {
      if (count > topCount) {
        topCargo = cargo;
        topCount = count;
      }
    }

    return {
      total: data.length,
      vessels: uniqueVessels.size,
      ports: uniquePorts.size,
      topCargo,
    };
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters: portFilter
        ? [{ id: 'porto_cidade', value: portFilter }]
        : [],
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border p-3">
          <p className="text-muted-foreground text-xs">Aparicoes</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-muted-foreground text-xs">Navios</p>
          <p className="text-xl font-bold">{stats.vessels}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-muted-foreground text-xs">Portos</p>
          <p className="text-xl font-bold">{stats.ports}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-muted-foreground text-xs">Carga Principal</p>
          <p className="text-xl font-bold truncate">{stats.topCargo}</p>
        </div>
      </div>

      {/* Port filter */}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Filtrar por porto..."
          value={portFilter}
          onChange={(e) => setPortFilter(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-muted-foreground text-sm">
          Mostrando {filteredCount} de {stats.total} resultados para
          &ldquo;{afretadorName}&rdquo;
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.getCanSort()
                        ? 'cursor-pointer select-none'
                        : ''
                    }
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {header.column.getIsSorted() === 'asc'
                      ? ' \u2191'
                      : header.column.getIsSorted() === 'desc'
                        ? ' \u2193'
                        : null}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            Pagina {table.getState().pagination.pageIndex + 1} de{' '}
            {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Proxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
