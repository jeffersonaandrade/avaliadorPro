"use client";

import { PriceInline } from "@/components/ui/PriceDisplay";
import { cn } from "@/lib/cn";

export type StrategyCardProps = {
  valorMin: number;
  valorMax: number;
  className?: string;
};

/**
 * Transforma números em ação: faixa de negociação em R$, linguagem direta.
 */
export function StrategyCard({
  valorMin,
  valorMax,
  className,
}: StrategyCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-slate-200 bg-slate-100 p-5 shadow-sm sm:p-6",
        className
      )}
    >
      <h2 className="text-center text-base font-black text-slate-900 sm:text-lg">
        Estratégia recomendada
      </h2>
      <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-slate-600">
        Para manter uma margem segura, negocie este veículo entre:
      </p>
      <div className="mt-5 flex w-full min-w-0 flex-wrap items-center justify-center gap-2 sm:gap-3">
        <PriceInline
          valor={valorMin}
          className="text-center text-xl text-slate-900 sm:text-2xl"
        />
        <span className="text-sm font-semibold text-slate-500">até</span>
        <PriceInline
          valor={valorMax}
          className="text-center text-xl text-slate-900 sm:text-2xl"
        />
      </div>
      <p className="mt-5 text-center text-xs font-semibold leading-relaxed text-slate-600 sm:text-sm">
        Nunca ultrapasse o preço máximo seguro.
      </p>
    </div>
  );
}
