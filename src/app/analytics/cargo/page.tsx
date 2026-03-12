import { createServiceClient } from '@/lib/supabase/server';
import { CargoCompositionChart } from '@/components/charts/cargo-composition-chart';
import type { CargoCompositionRow } from '@/types/analytics';

export const dynamic = 'force-dynamic';

export default async function CargoPage() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('v_cargo_composition')
    .select('*')
    .order('report_date', { ascending: true });

  const rows = (data as CargoCompositionRow[] | null) ?? [];

  // Extract distinct ports sorted alphabetically
  const ports = Array.from(new Set(rows.map((r) => r.porto_cidade)))
    .filter(Boolean)
    .sort();

  return (
    <main className="mx-auto max-w-7xl px-6 py-4 sm:py-8">
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Composicao de Carga</h1>
        <p className="text-muted-foreground text-sm">
          Distribuicao de tipos de carga por porto ao longo do tempo
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao carregar dados: {error.message}
        </div>
      )}

      <CargoCompositionChart data={rows} ports={ports} />
    </div>
    </main>
  );
}
