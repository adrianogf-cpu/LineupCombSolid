import { createServiceClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard-client";
import { WeekPicker } from "@/components/week-picker";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, FileText } from "lucide-react";
import type { LineupEntry } from "@/types/lineup";
import { fetchDiffEntries, fetchPreviousReport } from "@/lib/supabase/queries";
import type { DiffEntry } from "@/types/diff";

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
  searchParams: Promise<{ date?: string; diff?: string; compare?: string; minor?: string }>;
}) {
  const { date } = await searchParams;
  const supabase = createServiceClient();

  // Fetch available report dates for picker
  const { data: reportDates } = await supabase
    .from("lineup_reports")
    .select("report_date")
    .order("report_date", { ascending: false });

  const availableDates = (reportDates ?? []).map((r) => r.report_date.slice(0, 10));

  // Fetch the target report
  let report: LineupReport | null = null;

  if (date) {
    // date is YYYY-MM-DD, report_date may be timestamptz — filter by date range
    const dateStart = `${date.slice(0, 10)}T00:00:00`;
    const dateEnd = `${date.slice(0, 10)}T23:59:59`;
    const { data } = await supabase
      .from("lineup_reports")
      .select("id, report_date, filename, vessel_count")
      .gte("report_date", dateStart)
      .lte("report_date", dateEnd)
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

  // Diff mode
  let diffEntries: DiffEntry[] | null = null;
  const isDiffMode = (await searchParams).diff === '1';
  const compareParam = (await searchParams).compare;
  const showMinor = (await searchParams).minor === '1';

  if (isDiffMode && report) {
    try {
      let compareReportId: string | null = null;
      if (compareParam) {
        const { data: compareReport } = await supabase
          .from('lineup_reports')
          .select('id')
          .eq('report_date', compareParam)
          .limit(1)
          .single();
        compareReportId = compareReport?.id ?? null;
      } else {
        const prev = await fetchPreviousReport(supabase, report.report_date);
        compareReportId = prev?.id ?? null;
      }
      if (compareReportId) {
        diffEntries = await fetchDiffEntries(supabase, compareReportId, report.id);
      }
    } catch (e) {
      console.error('Diff fetch failed:', e);
    }
  }

  // Format date for display
  const reportDate = new Date(report.report_date.slice(0, 10) + "T12:00:00Z");
  const formattedDate = reportDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Lineup de Navios
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{formattedDate}</p>
        </div>

        {report.filename && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span className="max-w-[200px] truncate">{report.filename}</span>
          </div>
        )}
      </div>

      {/* Week Picker */}
      <div className="mb-4 sm:mb-6">
        <WeekPicker
          currentDate={report.report_date.slice(0, 10)}
          availableDates={availableDates}
        />
      </div>

      {/* Dashboard: Filters + Summary + Table */}
      {lineupEntries.length > 0 ? (
        <DashboardClient
          entries={lineupEntries}
          diffEntries={diffEntries}
          isDiffMode={isDiffMode}
          showMinor={showMinor}
          compareDate={compareParam ?? null}
          availableDates={availableDates}
          reportDate={report.report_date}
        />
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
