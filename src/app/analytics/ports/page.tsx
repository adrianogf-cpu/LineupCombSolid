import { createServiceClient } from '@/lib/supabase/server';
import { PortTrendsChart } from '@/components/charts/port-trends-chart';
import type { PortTrendRow } from '@/types/analytics';

export const dynamic = 'force-dynamic';

export default async function PortTrendsPage() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('v_port_trends')
    .select('*')
    .order('report_date');

  if (error || !data?.length) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold">Tendencias por Porto</h1>
        <p className="text-muted-foreground">Nenhum dado disponivel.</p>
      </div>
    );
  }

  const rows = data as PortTrendRow[];

  // Compute subtitle info
  const dates = [...new Set(rows.map((r) => r.report_date))].sort();
  const firstDate = formatDateBR(dates[0]);
  const lastDate = formatDateBR(dates[dates.length - 1]);
  const reportCount = dates.length;

  return (
    <main className="mx-auto max-w-7xl px-5 sm:px-6 py-4 sm:py-8">
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Tendencias por Porto</h1>
        <p className="text-muted-foreground text-sm">
          {reportCount} relatorios de {firstDate} a {lastDate}
        </p>
      </div>

      <PortTrendsChart data={rows} />
    </div>
    </main>
  );
}

/** Format ISO date to DD/MM/YYYY */
function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}
