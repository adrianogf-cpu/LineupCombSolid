import { createServiceClient } from "@/lib/supabase/server";
import { PeriodPicker } from "@/components/period-picker";
import { PeriodClient } from "@/components/period-client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange, Info } from "lucide-react";
import type { LineupEntry } from "@/types/lineup";
import type { VesselTimelineRow } from "@/types/analytics";

export const dynamic = "force-dynamic";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatPtBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function PeriodoPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date();
  const defaultTo = toISO(today);
  const defaultFrom = toISO(new Date(today.getTime() - 45 * 86_400_000));

  const from = sp.from && ISO_RE.test(sp.from) ? sp.from : defaultFrom;
  const to = sp.to && ISO_RE.test(sp.to) ? sp.to : defaultTo;

  const supabase = createServiceClient();

  // Filter by REPORT date: include every entry from reports received within the
  // selected window, then deduplicate so a vessel listed across several reports
  // is counted once. A 1-day window ≈ that report's contents (deduplicated).
  const { data, error } = await supabase
    .from("v_vessel_timeline")
    .select("*")
    .gte("report_date", from)
    .lte("report_date", to)
    .order("report_date", { ascending: false });

  const rows = (data as VesselTimelineRow[] | null) ?? [];

  // Deduplicate across the window's reports: keep the most recent snapshot
  // (rows are sorted report_date DESC → first occurrence of each key is latest).
  // A named vessel is identified by name+port+op. Placeholders (TBN/TBA) share
  // the same name, so distinct voyages would collapse and be lost — for those we
  // key on the stable voyage attributes (cargo, origin, charterer, quantity).
  const seen = new Map<string, VesselTimelineRow>();
  for (const r of rows) {
    const name = (r.vessel_name_canonical ?? "").trim().toUpperCase();
    const base = `${name}|${r.porto_cidade ?? ""}|${r.op ?? ""}`;
    const isPlaceholder = name === "" || name === "TBN" || name === "TBA";
    const key = isPlaceholder
      ? `${base}|${r.carga ?? ""}|${r.origem ?? ""}|${r.afretador ?? ""}|${r.quantidade ?? ""}`
      : base;
    if (!seen.has(key)) seen.set(key, r);
  }

  const entries: LineupEntry[] = Array.from(seen.values())
    .map((r, i) => ({
      id: `period-${i}`,
      report_id: "",
      vessel_name_raw: r.vessel_name_canonical,
      vessel_name_canonical: r.vessel_name_canonical,
      porto_cidade: r.porto_cidade,
      porto_terminal: r.porto_terminal,
      eta: r.eta,
      etb: r.etb,
      ets: r.ets,
      op: r.op,
      quantidade: r.quantidade,
      carga: r.carga,
      origem: r.origem,
      destino: r.destino,
      afretador: r.afretador,
    }))
    .sort((a, b) =>
      (a.eta ?? a.etb ?? "").localeCompare(b.eta ?? b.etb ?? "")
    );

  return (
    <main className="mx-auto max-w-7xl px-6 py-4 sm:py-8">
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-bold tracking-tight">
            <CalendarRange className="h-5 w-5" />
            Análise por Período
          </h1>
          <p className="text-sm text-muted-foreground">
            Navios consolidados dos relatórios de {formatPtBR(from)} a{" "}
            {formatPtBR(to)} — cada navio aparece uma única vez (snapshot mais
            recente). Use os filtros de Carga e OP abaixo.
          </p>
        </div>

        <PeriodPicker from={from} to={to} />

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Erro ao carregar dados: {error.message}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Janela pela data do relatório (todos os relatórios recebidos no
            intervalo). Navios sem nome (&ldquo;TBN&rdquo;) são distinguidos por
            carga, origem, afretador e quantidade; placeholders idênticos ainda
            podem ser agrupados.
          </span>
        </div>

        {entries.length > 0 ? (
          <PeriodClient entries={entries} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-muted-foreground">
                Nenhum relatório encontrado neste período
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}
