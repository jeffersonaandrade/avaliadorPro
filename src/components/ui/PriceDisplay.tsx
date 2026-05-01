"use client";

import type { ComponentProps } from "react";

import { DS } from "@/design-system/tokens";
import { formatarMoedaBRLExibicao } from "@/lib/formato-moeda-exibicao";
import { cn } from "@/lib/cn";

const heroSpanBase =
  "inline-block text-center whitespace-nowrap tabular-nums tracking-tight";

/**
 * Valor monetário em destaque (hero). Formatação **somente** via `formatarMoedaBRLExibicao`.
 */
export function PriceHero({
  valor,
  className,
  spanClassName,
}: {
  valor: number | null;
  className?: string;
  spanClassName?: string;
}) {
  const ok = valor !== null && Number.isFinite(valor);
  const formatted = ok ? formatarMoedaBRLExibicao(valor!) : "—";
  return (
    <div
      className={cn(
        "flex w-full min-w-0 justify-center overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]",
        className
      )}
    >
      <span
        className={cn(heroSpanBase, DS.typography.heroPrice, spanClassName)}
        title={ok ? formatted : undefined}
      >
        {formatted}
      </span>
    </div>
  );
}

/**
 * Valor monetário em linha (frases, listas). Mesma formatação que o hero.
 */
export function PriceInline({
  valor,
  className,
}: {
  valor: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums tracking-tight font-bold",
        className
      )}
    >
      {formatarMoedaBRLExibicao(valor)}
    </span>
  );
}

/** Alias: mesmo comportamento que `PriceHero` (API pedida como `PriceDisplay`). */
export function PriceDisplay(props: ComponentProps<typeof PriceHero>) {
  return <PriceHero {...props} />;
}
