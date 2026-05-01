"use client";

import { DS } from "@/design-system/tokens";
import { PriceHero, PriceInline } from "@/components/ui/PriceDisplay";
import { cn } from "@/lib/cn";

export type PrecoMaximoSeguroProps = {
  valor: number | null;
  fipe?: number;
  variant?: "ui" | "pdf";
  className?: string;
};

/**
 * Bloco “Preço máximo seguro” — valores apenas via `PriceHero` / `PriceInline`.
 */
export function PrecoMaximoSeguro({
  valor,
  fipe,
  variant = "ui",
  className = "",
}: PrecoMaximoSeguroProps) {
  const fipeOk =
    fipe !== undefined && Number.isFinite(fipe) && fipe > 0;

  const shell = cn(
    "min-w-0 border-2 border-slate-900 text-white",
    DS.colors.primary,
    DS.radius.lg,
    variant === "pdf"
      ? cn(DS.spacing.md, "sm:p-5")
      : cn(DS.spacing.lg, "shadow-inner ring-1 ring-slate-800 sm:p-8"),
    className
  );

  return (
    <div className={shell}>
      <p className="text-center text-xs font-bold uppercase tracking-widest text-amber-300/90 sm:text-sm">
        💰 Preço máximo seguro
      </p>
      <div className="mt-3">
        <PriceHero valor={valor} />
      </div>
      <p className="mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-slate-300">
        Acima desse valor, você começa a perder dinheiro nessa compra.
      </p>
      {fipeOk ? (
        <p className="mx-auto mt-3 max-w-lg text-center text-[11px] leading-relaxed text-slate-500">
          Referência de venda realista considerada:{" "}
          <PriceInline
            valor={fipe!}
            className="font-mono font-semibold text-slate-400"
          />
        </p>
      ) : null}
    </div>
  );
}
