import { createServiceClient } from "@/lib/supabase/server";
import { LineupTable } from "@/components/lineup-table";
import { WeekPicker } from "@/components/week-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, FileText } from "lucide-react";
import type { LineupEntry } from "@/types/lineup";

export const dynamic = "force-dynamic";

interface LineupReport {
  id: string;
  report_date: string;
  filename: string | null;
  vessel_count: number | null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const supabase = createServiceClient();

  // Fetch available report dates for picker
  const { data: reportDates } = await supabase
    .from("lineup_reports")
    .select("report_date")
    .order("report_date", { ascending: false });

  const availableDates = (reportDates ?? []).map((r) => r.report_date);

  // Fetch the target report
  let report: LineupReport | null = null;

  if (date) {
    const { data } = await supabase
      .from("lineup_reports")
      .select("id, report_date, filename, vessel_count")
      .eq("report_date", date)
      .limit(1)
      .single();
    report = data;
  } else {
    const { data } = await supabase
      .from("lineup_reports")
      .select("id, report_date, filename, vessel_count")
      .order("report_date", { ascending: false })
      .limit(1)
      .single();
    report = data;
  }

  // No reports at all
  if (!report) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Ship className="h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-semibold">
            Nenhum relatorio disponivel
          </h2>
          <p className="mt-2 text-muted-foreground">
            Envie um PDF de lineup para começar.
          </p>
        </div>
      </main>
    );
  }

  // Fetch entries for this report
  const { data: entries } = await supabase
    .from("lineup_entries")
    .select("*")
    .eq("report_id", report.id)
    .order("vessel_name_raw", { ascending: true });

  const lineupEntries: LineupEntry[] = entries ?? [];

  // Format date for display
  const reportDate = new Date(report.report_date + "T12:00:00Z");
  const formattedDate = reportDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Lineup de Navios
          </h1>
          <p className="text-muted-foreground capitalize">{formattedDate}</p>
        </div>

        <div className="flex items-center gap-4">
          <Card className="py-3">
            <CardContent className="flex items-center gap-2 px-4">
              <Ship className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {report.vessel_count ?? lineupEntries.length}
              </span>
              <span className="text-sm text-muted-foreground">navios</span>
            </CardContent>
          </Card>

          {report.filename && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span className="max-w-[200px] truncate">{report.filename}</span>
            </div>
          )}
        </div>
      </div>

      {/* Week Picker */}
      <div className="mb-6">
        <WeekPicker
          currentDate={report.report_date}
          availableDates={availableDates}
        />
      </div>

      {/* Table */}
      {lineupEntries.length > 0 ? (
        <LineupTable entries={lineupEntries} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-muted-foreground">
              Nenhuma entrada encontrada neste relatorio
            </CardTitle>
          </CardHeader>
        </Card>
      )}
    </main>
  );
}
