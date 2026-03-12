'use client';

import type { VesselTimelineRow } from '@/types/analytics';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VesselTimelineTableProps {
  entries: VesselTimelineRow[];
  query: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatQty(qty: number | null): string {
  if (qty == null) return '-';
  return qty.toLocaleString('pt-BR');
}

export function VesselTimelineTable({ entries, query }: VesselTimelineTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        Nenhum navio encontrado para &apos;{query}&apos;
      </p>
    );
  }

  // Group by vessel name if multiple distinct vessels match
  const vesselGroups = new Map<string, VesselTimelineRow[]>();
  for (const entry of entries) {
    const name = entry.vessel_name_canonical;
    if (!vesselGroups.has(name)) {
      vesselGroups.set(name, []);
    }
    vesselGroups.get(name)!.push(entry);
  }

  const multipleVessels = vesselGroups.size > 1;

  return (
    <div className="space-y-6">
      {Array.from(vesselGroups.entries()).map(([vesselName, rows]) => (
        <div key={vesselName}>
          {multipleVessels && (
            <h3 className="mb-2 text-lg font-semibold">{vesselName}</h3>
          )}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semana</TableHead>
                  <TableHead>Porto</TableHead>
                  <TableHead>Terminal</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>ETB</TableHead>
                  <TableHead>ETS</TableHead>
                  <TableHead>OP</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Carga</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Afretador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={`${row.report_date}-${idx}`}>
                    <TableCell className="whitespace-nowrap">{formatDate(row.report_date)}</TableCell>
                    <TableCell>{row.porto_cidade ?? '-'}</TableCell>
                    <TableCell>{row.porto_terminal ?? '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatShortDate(row.eta)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatShortDate(row.etb)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatShortDate(row.ets)}</TableCell>
                    <TableCell>
                      {row.op ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.op === 'L'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : row.op === 'D'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {row.op}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">{formatQty(row.quantidade)}</TableCell>
                    <TableCell>{row.carga ?? '-'}</TableCell>
                    <TableCell>{row.origem ?? '-'}</TableCell>
                    <TableCell>{row.destino ?? '-'}</TableCell>
                    <TableCell>{row.afretador ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
