import { createServiceClient } from '@/lib/supabase/server';
import { AfretadorDataTable } from '@/components/afretador-data-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AfretadorSummaryRow, VesselTimelineRow } from '@/types/analytics';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AfretadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';

  const supabase = createServiceClient();

  // If query provided, fetch vessel timeline rows for that afretador
  if (query) {
    const { data } = await supabase
      .from('v_vessel_timeline')
      .select('*')
      .ilike('afretador', `%${query}%`)
      .order('report_date', { ascending: false });

    const entries = (data as VesselTimelineRow[] | null) ?? [];

    return (
      <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8">
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Rastreador de Afretadores</h1>
          <p className="text-muted-foreground text-sm">
            Historico completo do afretador no lineup
          </p>
        </div>

        <SearchForm initialQuery={query} />

        {entries.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            Nenhum resultado encontrado para &ldquo;{query}&rdquo;
          </p>
        ) : (
          <AfretadorDataTable data={entries} afretadorName={query} />
        )}
      </div>
      </main>
    );
  }

  // No query: show top afretadores
  const { data: topAfretadores } = await supabase
    .from('v_afretador_summary')
    .select('*')
    .order('appearance_count', { ascending: false })
    .limit(20);

  const afretadores = (topAfretadores as AfretadorSummaryRow[] | null) ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8">
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Rastreador de Afretadores</h1>
        <p className="text-muted-foreground text-sm">
          Busque por afretador ou explore os mais ativos no lineup
        </p>
      </div>

      <SearchForm initialQuery="" />

      {afretadores.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Top Afretadores ({afretadores.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {afretadores.map((a) => (
              <Link
                key={a.afretador}
                href={`/analytics/afretadores?q=${encodeURIComponent(a.afretador)}`}
                className="block rounded-lg border p-3 sm:p-4 transition-colors hover:bg-muted/50"
              >
                <p className="font-semibold">{a.afretador}</p>
                <div className="text-muted-foreground mt-1 grid grid-cols-2 gap-x-4 text-sm">
                  <span>Aparicoes: {a.appearance_count}</span>
                  <span>Navios: {a.unique_vessels}</span>
                  <span>Portos: {a.unique_ports}</span>
                  <span>
                    {formatDateShort(a.first_seen)} - {formatDateShort(a.last_seen)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {afretadores.length === 0 && (
        <p className="text-muted-foreground py-8 text-center">
          Nenhum afretador encontrado. Verifique se a view v_afretador_summary
          foi criada no Supabase.
        </p>
      )}
    </div>
    </main>
  );
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function SearchForm({ initialQuery }: { initialQuery: string }) {
  return (
    <form className="flex items-center gap-2">
      <Input
        type="text"
        name="q"
        placeholder="Nome do afretador (ex: COFCO, BUNGE)"
        defaultValue={initialQuery}
        className="max-w-sm"
      />
      <Button type="submit">Buscar</Button>
    </form>
  );
}
