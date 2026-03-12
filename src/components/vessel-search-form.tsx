'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface VesselSearchFormProps {
  initialQuery?: string;
}

export function VesselSearchForm({ initialQuery = '' }: VesselSearchFormProps) {
  const [value, setValue] = useState(initialQuery);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      router.push(`/analytics/vessels?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        type="text"
        placeholder="Nome do navio (ex: STAR LIMA)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="max-w-sm"
      />
      <Button type="submit">Buscar</Button>
    </form>
  );
}
