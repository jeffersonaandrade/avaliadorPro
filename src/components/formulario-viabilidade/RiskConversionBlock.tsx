"use client";

import Link from "next/link";
import { Lock, Shield } from "lucide-react";

import { BaseCard } from "@/components/ui/BaseCard";
import { PriceInline } from "@/components/ui/PriceDisplay";
import { DS } from "@/design-system/tokens";
import { cn } from "@/lib/cn";

export type RiskConversionBlockProps = {
  contextoAtivo: boolean;
  blindagemAtiva: boolean;
  estimativaPerdaIndicativaReais: number;
  podeAtivarPorSaldo: boolean;
  consultandoBlindagem: boolean;
  onAbrirModalBlindagem: () => void;
};

export function RiskConversionBlock({
  contextoAtivo,
  blindagemAtiva,
  estimativaPerdaIndicativaReais,
  podeAtivarPorSaldo,
  consultandoBlindagem,
  onAbrirModalBlindagem,
}: RiskConversionBlockProps) {
  if (!contextoAtivo || blindagemAtiva) return null;

  return (
    <BaseCard
      className={cn(
        "border-2 border-indigo-300/80 bg-gradient-to-b from-indigo-50/95 to-white shadow-md ring-1 ring-indigo-100",
        "!p-5 sm:!p-6"
      )}
      data-testid="risk-conversion-block"
      gapClass="gap-4"
    >
      <p
        className={cn(
          DS.typography.title,
          "text-center text-sm text-indigo-950"
        )}
      >
        Riscos ocultos podem impactar significativamente o valor de mercado deste
        veículo.
      </p>
      <BaseCard.Subtitle className="mx-auto max-w-md text-center text-xs text-indigo-900/85">
        Valide para proteger sua margem — a blindagem usa bases oficiais (leilão,
        sinistro, gravame, Renainf e mais) para fechar o histórico.
      </BaseCard.Subtitle>

      <BaseCard
        className="mx-auto max-w-lg !p-3 border border-amber-200/90 bg-amber-50/90 text-center"
        gapClass="gap-2"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
          Referência indicativa (percepção de risco)
        </p>
        <p className="text-sm font-medium leading-snug text-amber-950">
          Perfil semelhante pode perder até{" "}
          <PriceInline
            valor={estimativaPerdaIndicativaReais}
            className="font-mono text-base font-black text-amber-950"
          />{" "}
          em valor de mercado quando o histórico não está mapeado.
        </p>
      </BaseCard>

      <div className="flex flex-col items-center gap-3">
        {podeAtivarPorSaldo ? (
          <button
            type="button"
            data-testid="btn-blindar-negociacao-cta"
            disabled={consultandoBlindagem}
            onClick={onAbrirModalBlindagem}
            className="inline-flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
          >
            <Shield className="size-6 shrink-0" aria-hidden />
            {consultandoBlindagem
              ? "Validando histórico…"
              : "Validar histórico e proteger lucro (1 crédito)"}
          </button>
        ) : (
          <Link
            href="/creditos"
            className="inline-flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:text-lg"
          >
            <Lock className="size-5 shrink-0" aria-hidden />
            Validar histórico e proteger lucro — obter crédito
          </Link>
        )}
        <p className="text-center text-[11px] text-slate-500">
          A consulta só roda quando você confirmar no fluxo — nada é debitado ao
          abrir esta tela.
        </p>
      </div>
    </BaseCard>
  );
}
