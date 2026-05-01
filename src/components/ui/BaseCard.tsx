"use client";

import type { ComponentPropsWithoutRef } from "react";

import { DS } from "@/design-system/tokens";
import { cn } from "@/lib/cn";

type BaseCardRootProps = {
  children: React.ReactNode;
  className?: string;
  /** Espaçamento vertical entre filhos diretos. */
  gapClass?: "gap-2" | "gap-3" | "gap-4" | "gap-6";
} & ComponentPropsWithoutRef<"div">;

function BaseCardRoot({
  children,
  className,
  gapClass = "gap-4",
  ...rest
}: BaseCardRootProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-full min-w-0 flex-col overflow-hidden break-words rounded-2xl",
        DS.spacing.card,
        gapClass,
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

function Title({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 break-words text-pretty",
        DS.typography.title,
        className
      )}
    >
      {children}
    </div>
  );
}

function Subtitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "min-w-0 break-words text-pretty leading-relaxed",
        DS.typography.subtitle,
        className
      )}
    >
      {children}
    </p>
  );
}

/** Conteúdo numérico em destaque — envolver `PriceHero` / `PriceInline`. */
function Value({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 text-center tabular-nums whitespace-nowrap",
        className
      )}
    >
      {children}
    </div>
  );
}

export const BaseCard = Object.assign(BaseCardRoot, {
  Title,
  Subtitle,
  Value,
});
