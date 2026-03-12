'use client';

import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { PortTrendRow } from '@/types/analytics';

const COLORS = [
  '#2563eb',
  '#60a5fa',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

interface PortTrendsChartProps {
  data: PortTrendRow[];
}

export function PortTrendsChart({ data }: PortTrendsChartProps) {
  // Rank ports by total vessel count descending
  const rankedPorts = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of data) {
      totals.set(
        row.porto_cidade,
        (totals.get(row.porto_cidade) ?? 0) + row.vessel_count
      );
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([port]) => port);
  }, [data]);

  const [selectedPorts, setSelectedPorts] = useState<Set<string>>(
    () => new Set(rankedPorts.slice(0, 5))
  );

  // Build chart config from all ports
  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    for (let i = 0; i < rankedPorts.length; i++) {
      const port = rankedPorts[i];
      config[port] = { label: port, color: COLORS[i % COLORS.length] };
    }
    return config;
  }, [rankedPorts]);

  // Pivot data: one object per report_date with port names as keys
  const { vesselData, volumeData, dates } = useMemo(() => {
    const byDate = new Map<
      string,
      { vessels: Record<string, number>; volumes: Record<string, number> }
    >();

    for (const row of data) {
      if (!byDate.has(row.report_date)) {
        byDate.set(row.report_date, { vessels: {}, volumes: {} });
      }
      const entry = byDate.get(row.report_date)!;
      entry.vessels[row.porto_cidade] = row.vessel_count;
      entry.volumes[row.porto_cidade] = row.total_volume;
    }

    const sortedDates = [...byDate.keys()].sort();

    const vessels = sortedDates.map((d) => ({
      report_date: formatDate(d),
      ...byDate.get(d)!.vessels,
    }));

    const volumes = sortedDates.map((d) => ({
      report_date: formatDate(d),
      ...byDate.get(d)!.volumes,
    }));

    return { vesselData: vessels, volumeData: volumes, dates: sortedDates };
  }, [data]);

  function togglePort(port: string) {
    setSelectedPorts((prev) => {
      const next = new Set(prev);
      if (next.has(port)) {
        next.delete(port);
      } else {
        next.add(port);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedPorts(new Set(rankedPorts));
  }

  function selectTop5() {
    setSelectedPorts(new Set(rankedPorts.slice(0, 5)));
  }

  const activePorts = rankedPorts.filter((p) => selectedPorts.has(p));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Port selector */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent"
        >
          Todos
        </button>
        <button
          type="button"
          onClick={selectTop5}
          className="rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent"
        >
          Top 5
        </button>
        {rankedPorts.map((port) => (
          <button
            key={port}
            type="button"
            onClick={() => togglePort(port)}
            className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
              selectedPorts.has(port)
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            }`}
          >
            {port}
          </button>
        ))}
      </div>

      {/* Vessel count chart */}
      <div>
        <h3 className="mb-2 text-base sm:text-lg font-semibold">
          Navios por Porto ao Longo do Tempo
        </h3>
        <ChartContainer config={chartConfig} className="h-[220px] sm:h-[300px] w-full">
          <LineChart data={vesselData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="report_date" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {activePorts.map((port) => (
              <Line
                key={port}
                type="monotone"
                dataKey={port}
                stroke={COLORS[rankedPorts.indexOf(port) % COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ChartContainer>
      </div>

      {/* Volume chart */}
      <div>
        <h3 className="mb-2 text-base sm:text-lg font-semibold">
          Volume de Carga por Porto (MT)
        </h3>
        <ChartContainer config={chartConfig} className="h-[220px] sm:h-[300px] w-full">
          <LineChart data={volumeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="report_date" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v: number) =>
                v.toLocaleString('pt-BR')
              }
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {activePorts.map((port) => (
              <Line
                key={port}
                type="monotone"
                dataKey={port}
                stroke={COLORS[rankedPorts.indexOf(port) % COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}

/** Format ISO date string to DD/MM */
function formatDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}
