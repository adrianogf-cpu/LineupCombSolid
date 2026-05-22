"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

interface PeriodPickerProps {
  from: string;
  to: string;
}

export function PeriodPicker({ from, to }: PeriodPickerProps) {
  const router = useRouter();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  function apply(nf: string = f, nt: string = t) {
    router.push(`/periodo?from=${nf}&to=${nt}`);
  }

  function preset(days: number) {
    const nt = isoToday();
    const nf = isoDaysAgo(days);
    setF(nf);
    setT(nt);
    apply(nf, nt);
  }

  const presets = [
    { days: 30, label: "30 dias" },
    { days: 45, label: "45 dias" },
    { days: 90, label: "90 dias" },
  ];

  return (
    <div className="flex flex-wrap items-end gap-2 sm:gap-3">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">De</label>
        <Input
          type="date"
          value={f}
          max={t}
          onChange={(e) => setF(e.target.value)}
          className="h-9 w-[150px] text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Até</label>
        <Input
          type="date"
          value={t}
          min={f}
          onChange={(e) => setT(e.target.value)}
          className="h-9 w-[150px] text-sm"
        />
      </div>
      <Button className="h-9" onClick={() => apply()}>
        Aplicar
      </Button>
      <div className="flex items-center gap-1">
        {presets.map((p) => (
          <Button
            key={p.days}
            variant="outline"
            size="sm"
            className="h-9 text-sm"
            onClick={() => preset(p.days)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
