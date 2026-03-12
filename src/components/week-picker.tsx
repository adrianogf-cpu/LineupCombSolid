"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

function formatDatePtBR(isoDate: string): string {
  // Handle both "2026-01-28" and "2026-01-28T03:00:00+00:00" formats
  const dateOnly = isoDate.slice(0, 10);
  const [year, month, day] = dateOnly.split("-");
  return `${day}/${month}/${year}`;
}

interface WeekPickerProps {
  currentDate: string;
  availableDates: string[];
}

export function WeekPicker({ currentDate, availableDates }: WeekPickerProps) {
  const router = useRouter();

  const currentIndex = availableDates.indexOf(currentDate);
  const isLatest = currentIndex === 0;
  const isOldest = currentIndex === availableDates.length - 1;

  function navigateTo(date: string) {
    router.push(`/?date=${date}`);
  }

  function goNewer() {
    if (currentIndex > 0) {
      navigateTo(availableDates[currentIndex - 1]);
    }
  }

  function goOlder() {
    if (currentIndex < availableDates.length - 1) {
      navigateTo(availableDates[currentIndex + 1]);
    }
  }

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Button
        variant="outline"
        size="icon"
        onClick={goOlder}
        disabled={isOldest}
        aria-label="Relatorio anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select value={currentDate} onValueChange={navigateTo}>
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableDates.map((date, idx) => (
            <SelectItem key={date} value={date}>
              {formatDatePtBR(date)}
              {idx === 0 ? " (Mais recente)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={goNewer}
        disabled={isLatest}
        aria-label="Relatorio mais recente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
