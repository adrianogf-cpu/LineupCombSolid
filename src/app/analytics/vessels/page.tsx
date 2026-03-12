import { createServiceClient } from '@/lib/supabase/server';
import { VesselSearchForm } from '@/components/vessel-search-form';
import { VesselTimelineTable } from '@/components/vessel-timeline-table';
import type { VesselTimelineRow } from '@/types/analytics';

export const dynamic = 'force-dynamic';

export default async function VesselsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';

  let entries: VesselTimelineRow[] = [];

  if (query) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('v_vessel_timeline')
      .select('*')
      .ilike('vessel_name_canonical', `%${query}%`)
      .order('report_date', { ascending: true });

    entries = (data as VesselTimelineRow[] | null) ?? [];
  }

  return (
    <main className="mx-auto max-w-7xl px-5 sm:px-6 py-4 sm:py-8">
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Timeline de Navios</h1>
        <p className="text-muted-foreground text-sm">
          Pesquise um navio para ver seu historico completo no lineup
        </p>
      </div>

      <VesselSearchForm initialQuery={query} />

      {query && (
        <VesselTimelineTable entries={entries} query={query} />
      )}
    </div>
    </main>
  );
}
