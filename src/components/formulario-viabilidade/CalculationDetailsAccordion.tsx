"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/**
 * BLOCO 3 — Memória de cálculo e detalhes técnicos (accordion).
 */
export function CalculationDetailsAccordion({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <details
      className="group min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-300/90 bg-slate-50/50 shadow-sm open:bg-white [&_summary::-webkit-details-marker]:hidden"
      data-testid="calculation-details-accordion"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-left">
        <span className="text-sm font-bold text-slate-800">
          Detalhes técnicos e memória de cálculo
        </span>
        <ChevronDown
          className="size-5 shrink-0 text-slate-500 transition duration-200 group-open:rotate-180"
          strokeWidth={2}
        />
      </summary>
      <div className="space-y-6 border-t border-slate-200 p-4 pt-5">{children}</div>
    </details>
  );
}
