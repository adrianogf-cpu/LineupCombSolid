"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Ship, MapPin, ArrowLeftRight, Package } from "lucide-react";
import type { LineupEntry } from "@/types/lineup";

export function SummaryCards({ entries }: { entries: LineupEntry[] }) {
  const stats = useMemo(() => {
    const totalNavios = entries.length;

    const portosSet = new Set<string>();
    entries.forEach((e) => e.porto_cidade && portosSet.add(e.porto_cidade));
    const portos = portosSet.size;

    let loading = 0;
    let discharge = 0;
    entries.forEach((e) => {
      const opVal = e.op?.toUpperCase();
      if (opVal === "L") loading++;
      else if (opVal === "D") discharge++;
    });

    // Top cargo
    const cargaCount = new Map<string, number>();
    entries.forEach((e) => {
      if (e.carga) {
        cargaCount.set(e.carga, (cargaCount.get(e.carga) ?? 0) + 1);
      }
    });
    let topCarga = "-";
    let topCargaCount = 0;
    cargaCount.forEach((count, cargo) => {
      if (count > topCargaCount) {
        topCargaCount = count;
        topCarga = cargo;
      }
    });

    return { totalNavios, portos, loading, discharge, topCarga, topCargaCount };
  }, [entries]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="py-3">
        <CardContent className="flex items-center gap-3 px-4">
          <Ship className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{stats.totalNavios}</p>
            <p className="text-xs text-muted-foreground">Total navios</p>
          </div>
        </CardContent>
      </Card>

      <Card className="py-3">
        <CardContent className="flex items-center gap-3 px-4">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{stats.portos}</p>
            <p className="text-xs text-muted-foreground">Portos</p>
          </div>
        </CardContent>
      </Card>

      <Card className="py-3">
        <CardContent className="flex items-center gap-3 px-4">
          <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">
              <span className="text-green-600">{stats.loading}L</span>
              {" / "}
              <span className="text-blue-600">{stats.discharge}D</span>
            </p>
            <p className="text-xs text-muted-foreground">Load / Discharge</p>
          </div>
        </CardContent>
      </Card>

      <Card className="py-3">
        <CardContent className="flex items-center gap-3 px-4">
          <Package className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold truncate max-w-[140px]" title={stats.topCarga}>
              {stats.topCarga}
            </p>
            <p className="text-xs text-muted-foreground">
              Top carga ({stats.topCargaCount})
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
