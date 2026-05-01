"use client";

import { cn } from "@/lib/cn";

export type RiskAlertCardProps = {
  className?: string;
};

/**
 * Alerta de risco estrutural — alto contraste, linguagem simples (sem jargão técnico).
 */
export function RiskAlertCard({ className }: RiskAlertCardProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl bg-red-600 p-5 text-white shadow-lg sm:p-6",
        className
      )}
    >
      <p className="text-center text-4xl leading-none sm:text-5xl" aria-hidden>
        ⚠️
      </p>
      <h2 className="mt-3 text-center text-lg font-black leading-snug sm:text-xl">
        Risco detectado nesse veículo
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-relaxed text-white/95">
        Esse veículo possui histórico que reduz o valor de mercado e dificulta a
        revenda.
      </p>
      <ul className="mx-auto mt-5 max-w-md list-disc space-y-2 pl-5 text-sm leading-relaxed marker:text-white/90">
        <li className="pl-1">Leilão</li>
        <li className="pl-1">Sinistro</li>
        <li className="pl-1">Roubo</li>
        <li className="pl-1">Gravame</li>
      </ul>
      <p className="mt-6 border-t border-white/25 pt-5 text-center text-sm font-semibold leading-relaxed text-white">
        Esse tipo de veículo costuma vender mais barato e demorar mais.
      </p>
    </div>
  );
}
