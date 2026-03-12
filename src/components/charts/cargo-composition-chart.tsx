'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { CargoCompositionRow } from '@/types/analytics';

// Distinct color palette for cargo types
const CARGO_COLORS = [
  'hsl(210, 70%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(350, 65%, 50%)',
  'hsl(270, 55%, 55%)',
  'hsl(180, 50%, 45%)',
  'hsl(60, 70%, 45%)',
  'hsl(330, 60%, 50%)',
  'hsl(200, 60%, 55%)',
  'hsl(100, 50%, 45%)',
  'hsl(15, 75%, 50%)',
  'hsl(240, 50%, 55%)',
];

interface CargoCompositionChartProps {
  data: CargoCompositionRow[];
  ports: string[];
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

function formatVolumeCard(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function CargoCompositionChart({
  data,
  ports,
}: CargoCompositionChartProps) {
  const [selectedPort, setSelectedPort] = useState<string>('__ALL__');

  // Filter by port (or aggregate all)
  const filtered = useMemo(() => {
    if (selectedPort === '__ALL__') return data;
    return data.filter((r) => r.porto_cidade === selectedPort);
  }, [data, selectedPort]);

  // Get unique cargo types
  const cargoTypes = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((r) => set.add(r.carga));
    return Array.from(set).sort();
  }, [filtered]);

  // Build ChartConfig dynamically
  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    cargoTypes.forEach((cargo, i) => {
      config[cargo] = {
        label: cargo,
        color: CARGO_COLORS[i % CARGO_COLORS.length],
      };
    });
    return config;
  }, [cargoTypes]);

  // Pivot data: one object per report_date with cargo types as keys
  const pivotedData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();

    for (const row of filtered) {
      if (!map.has(row.report_date)) {
        map.set(row.report_date, { report_date: row.report_date });
      }
      const entry = map.get(row.report_date)!;
      // Aggregate volumes when showing all ports (same cargo may appear in multiple ports)
      entry[row.carga] =
        ((entry[row.carga] as number) || 0) + (row.total_volume ?? 0);
    }

    return Array.from(map.values()).sort((a, b) =>
      String(a.report_date).localeCompare(String(b.report_date))
    );
  }, [filtered]);

  // Summary: total volume per cargo type for selected port
  const cargoSummary = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of filtered) {
      totals.set(row.carga, (totals.get(row.carga) || 0) + (row.total_volume ?? 0));
    }
    return Array.from(totals.entries())
      .map(([cargo, volume]) => ({ cargo, volume }))
      .sort((a, b) => b.volume - a.volume);
  }, [filtered]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        Nenhum dado de carga disponivel. Execute a view SQL primeiro.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Port selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="port-select" className="text-sm font-medium">
          Porto:
        </label>
        <select
          id="port-select"
          value={selectedPort}
          onChange={(e) => setSelectedPort(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="__ALL__">Todos os portos</option>
          {ports.map((port) => (
            <option key={port} value={port}>
              {port}
            </option>
          ))}
        </select>
      </div>

      {/* Stacked bar chart */}
      <ChartContainer config={chartConfig} className="h-[260px] sm:h-[350px] w-full">
        <BarChart data={pivotedData} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="report_date"
            tickLine={false}
            axisLine={false}
            tickFormatter={formatDate}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={formatVolume}
            width={60}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => formatDate(String(value))}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {cargoTypes.map((cargo, i) => (
            <Bar
              key={cargo}
              dataKey={cargo}
              stackId="cargo"
              fill={CARGO_COLORS[i % CARGO_COLORS.length]}
              radius={0}
            />
          ))}
        </BarChart>
      </ChartContainer>

      {/* Summary section */}
      {cargoSummary.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Volume por Tipo de Carga
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cargoSummary.map(({ cargo, volume }, i) => (
              <div
                key={cargo}
                className="rounded-lg border p-2 sm:p-3 space-y-0.5 sm:space-y-1"
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 rounded-sm"
                    style={{
                      backgroundColor:
                        CARGO_COLORS[
                          cargoTypes.indexOf(cargo) % CARGO_COLORS.length
                        ],
                    }}
                  />
                  <span className="text-xs sm:text-sm font-medium truncate">
                    {cargo}
                  </span>
                </div>
                <p className="text-sm sm:text-xl font-bold tabular-nums">
                  <span className="sm:hidden">{formatVolume(volume)}</span>
                  <span className="hidden sm:inline">{formatVolumeCard(volume)}</span>
                  {' '}<span className="text-xs font-normal">MT</span>
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  #{i + 1} por volume
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
