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

/**
 * The operational date used to decide whether a vessel "operated" within the
 * selected window. ETB (berthing = start of operation) is the best proxy for
 * when cargo was actually loaded/discharged; fall back to ETA, then ETS.
 */
function opDate(r: VesselTimelineRow): string | null {
  return r.etb ?? r.eta ?? r.ets ?? null;
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

  // Back-buffer on report_date: a vessel operating near `from` may have its last
  // snapshot in a report dated a few days earlier (reports arrive ~2x/week).
  const fromBuffer = toISO(
    new Date(new Date(from + "T00:00:00Z").getTime() - 14 * 86_400_000)
  );

  const { data, error } = await supabase
    .from("v_vessel_timeline")
    .select("*")
    .gte("report_date", fromBuffer)
    .lte("report_date", to)
    .order("report_date", { ascending: false });

  const rows = (data as VesselTimelineRow[] | null) ?? [];

  // Deduplicate across reports: keep the most recent snapshot (rows are sorted
  // report_date DESC, so the first occurrence of each key is the latest) of
  // every vessel whose operation date falls inside the selected window.
  const seen = new Map<string, VesselTimelineRow>();
  for (const r of rows) {
    const od = opDate(r);
    if (!od || od < from || od > to) continue;
    const key = `${r.vessel_name_canonical ?? ""}|${r.porto_cidade ?? ""}|${r.op ?? ""}`;
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
      (a.etb ?? a.eta ?? "").localeCompare(b.etb ?? b.eta ?? "")
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
            Navios consolidados de {formatPtBR(from)} a {formatPtBR(to)} — cada
            navio aparece uma única vez (snapshot mais recente). Use os filtros
            de Carga e OP abaixo.
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
            Período pela data de operação (ETB → ETA → ETS). Navios sem nome
            definido (&ldquo;TBN&rdquo;) no mesmo porto/operação são agrupados e
            podem ser subestimados.
          </span>
        </div>

        {entries.length > 0 ? (
          <PeriodClient entries={entries} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-muted-foreground">
                Nenhum navio operou neste período
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}
