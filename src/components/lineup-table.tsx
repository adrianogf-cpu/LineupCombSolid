"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface LineupEntry {
  id: string;
  report_id: string;
  vessel_name_raw: string;
  vessel_name_canonical: string | null;
  porto_cidade: string | null;
  porto_terminal: string | null;
  eta: string | null;
  etb: string | null;
  ets: string | null;
  op: string | null;
  quantidade: number | null;
  carga: string | null;
  origem: string | null;
  destino: string | null;
  afretador: string | null;
}

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

export function LineupTable({ entries }: { entries: LineupEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Navio</TableHead>
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
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">
                {entry.vessel_name_canonical ?? entry.vessel_name_raw}
              </TableCell>
              <TableCell>{entry.porto_cidade ?? "-"}</TableCell>
              <TableCell>{entry.porto_terminal ?? "-"}</TableCell>
              <TableCell>{formatDateShort(entry.eta)}</TableCell>
              <TableCell>{formatDateShort(entry.etb)}</TableCell>
              <TableCell>{formatDateShort(entry.ets)}</TableCell>
              <TableCell>
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
              <TableCell className="text-right">
                {formatQuantidade(entry.quantidade)}
              </TableCell>
              <TableCell>{entry.carga ?? "-"}</TableCell>
              <TableCell>{entry.origem ?? "-"}</TableCell>
              <TableCell>{entry.destino ?? "-"}</TableCell>
              <TableCell>{entry.afretador ?? "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
