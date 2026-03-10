"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { LineupEntry } from "@/types/lineup";

interface FilterBarProps {
  entries: LineupEntry[];
  onFilter: (filtered: LineupEntry[]) => void;
}

const ALL = "__all__";

export function FilterBar({ entries, onFilter }: FilterBarProps) {
  const [porto, setPorto] = useState(ALL);
  const [carga, setCarga] = useState(ALL);
  const [afretador, setAfretador] = useState(ALL);
  const [op, setOp] = useState(ALL);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [search]);

  // Compute filter options from FULL dataset
  const portos = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.porto_cidade && set.add(e.porto_cidade));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [entries]);

  const cargas = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.carga && set.add(e.carga));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [entries]);

  const afretadores = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.afretador && set.add(e.afretador));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [entries]);

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = entries;

    if (porto !== ALL) {
      filtered = filtered.filter((e) => e.porto_cidade === porto);
    }
    if (carga !== ALL) {
      filtered = filtered.filter((e) => e.carga === carga);
    }
    if (afretador !== ALL) {
      filtered = filtered.filter((e) => e.afretador === afretador);
    }
    if (op !== ALL) {
      filtered = filtered.filter(
        (e) => e.op?.toUpperCase() === op.toUpperCase()
      );
    }
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.trim().toLowerCase();
      filtered = filtered.filter((e) => {
        const name = (e.vessel_name_canonical ?? e.vessel_name_raw).toLowerCase();
        return name.includes(term);
      });
    }

    onFilter(filtered);
  }, [entries, porto, carga, afretador, op, debouncedSearch, onFilter]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const hasActiveFilters =
    porto !== ALL ||
    carga !== ALL ||
    afretador !== ALL ||
    op !== ALL ||
    search.trim() !== "";

  function clearAll() {
    setPorto(ALL);
    setCarga(ALL);
    setAfretador(ALL);
    setOp(ALL);
    setSearch("");
    setDebouncedSearch("");
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Port filter */}
      <div className="min-w-[160px]">
        <label className="mb-1 block text-xs text-muted-foreground">Porto</label>
        <Select value={porto} onValueChange={setPorto}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Todos os portos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os portos</SelectItem>
            {portos.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cargo filter */}
      <div className="min-w-[160px]">
        <label className="mb-1 block text-xs text-muted-foreground">Carga</label>
        <Select value={carga} onValueChange={setCarga}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Todas as cargas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as cargas</SelectItem>
            {cargas.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Afretador filter */}
      <div className="min-w-[160px]">
        <label className="mb-1 block text-xs text-muted-foreground">
          Afretador
        </label>
        <Select value={afretador} onValueChange={setAfretador}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {afretadores.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* OP toggle */}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">OP</label>
        <div className="flex gap-1">
          {[
            { value: ALL, label: "All" },
            { value: "L", label: "L" },
            { value: "D", label: "D" },
          ].map((item) => (
            <Button
              key={item.value}
              variant={op === item.value ? "default" : "outline"}
              size="sm"
              className="h-9 px-3 text-sm"
              onClick={() => setOp(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Vessel search */}
      <div className="min-w-[200px]">
        <label className="mb-1 block text-xs text-muted-foreground">
          Buscar navio
        </label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nome do navio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-sm"
          onClick={clearAll}
        >
          <X className="mr-1 h-3 w-3" />
          Limpar
        </Button>
      )}
    </div>
  );
}
