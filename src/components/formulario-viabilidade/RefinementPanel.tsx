"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/**
 * BLOCO 2 — Refinamento: custos e parâmetros comerciais (fechado por padrão).
 */
export function RefinementPanel({ children }: { children: ReactNode }) {
  return (
    <details
      className="group min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100 open:border-slate-300 open:ring-slate-200 [&_summary::-webkit-details-marker]:hidden"
      data-testid="refinement-panel"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-left">
        <div>
          <span className="text-sm font-bold text-slate-900">
            Refinar lucro (opcional)
          </span>
          <p className="mt-0.5 text-xs text-slate-500">
            Ajuste custos e meta de venda sem chamar novas consultas.
          </p>
        </div>
        <ChevronDown
          className="size-5 shrink-0 text-slate-400 transition duration-200 group-open:rotate-180"
          strokeWidth={2}
        />
      </summary>
      <div className="flex flex-col gap-4 border-t border-slate-100 p-4 pt-4">
        {children}
      </div>
    </details>
  );
}
