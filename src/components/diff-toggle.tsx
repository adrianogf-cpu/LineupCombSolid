'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DiffEntry } from '@/types/diff';

interface DiffToggleProps {
  isDiffMode: boolean;
  showMinor: boolean;
  onToggleDiff: (enabled: boolean) => void;
  onToggleMinor: (enabled: boolean) => void;
  diffEntries: DiffEntry[] | null;
}

export function DiffToggle({
  isDiffMode,
  showMinor,
  onToggleDiff,
  onToggleMinor,
  diffEntries,
}: DiffToggleProps) {
  const counts = diffEntries
    ? {
        added: diffEntries.filter((e) => e.diff_status === 'ADDED').length,
        removed: diffEntries.filter((e) => e.diff_status === 'REMOVED').length,
        changed: diffEntries.filter((e) => e.diff_status === 'CHANGED').length,
      }
    : null;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Switch
          id="diff-toggle"
          checked={isDiffMode}
          onCheckedChange={onToggleDiff}
        />
        <Label htmlFor="diff-toggle">Comparar com semana anterior</Label>
      </div>
      {isDiffMode && counts && (
        <>
          <div className="flex items-center gap-2">
            <Switch
              id="minor-toggle"
              checked={showMinor}
              onCheckedChange={onToggleMinor}
            />
            <Label htmlFor="minor-toggle" className="text-xs text-muted-foreground">
              Mostrar ajustes menores (&le;3 dias)
            </Label>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              +{counts.added} novos
            </span>
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              -{counts.removed} removidos
            </span>
            <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              ~{counts.changed} alterados
            </span>
          </div>
        </>
      )}
    </div>
  );
}
