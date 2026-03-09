import { createServiceClient } from '@/lib/supabase/server';

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  duplicate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export default async function IngestionLogPage() {
  const supabase = createServiceClient();

  const { data: logs } = await supabase
    .from('ingestion_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ingestion Log</h1>

      {!logs || logs.length === 0 ? (
        <p className="text-muted-foreground">
          No ingestion attempts yet. Upload a PDF to get started.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-medium">Date/Time</th>
                <th className="pb-2 pr-4 font-medium">Filename</th>
                <th className="pb-2 pr-4 font-medium">Source</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Vessels</th>
                <th className="pb-2 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                  </td>
                  <td className="py-2 pr-4 max-w-[200px] truncate" title={log.filename}>
                    {log.filename}
                  </td>
                  <td className="py-2 pr-4">{log.source}</td>
                  <td className="py-2 pr-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[log.status] || statusColors.pending}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{log.vessel_count ?? '—'}</td>
                  <td className="py-2 text-xs text-muted-foreground max-w-[200px] truncate" title={log.error_message || ''}>
                    {log.error_message || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
