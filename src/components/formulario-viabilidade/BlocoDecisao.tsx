"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { BaseCard } from "@/components/ui/BaseCard";
import { PriceHero, PriceInline } from "@/components/ui/PriceDisplay";
import { cn } from "@/lib/cn";
import { type VereditoViabilidade } from "@/lib/viabilidade";

export function BlocoDecisaoMercadoPendente() {
  return (
    <BaseCard
      className="border-2 border-dashed border-indigo-300/80 bg-slate-50/90 text-center shadow-inner ring-1 ring-indigo-100/60"
      data-testid="bloco-decisao-mercado-pendente"
      gapClass="gap-3"
    >
      <BaseCard.Title className="text-sm font-semibold text-slate-800">
        Referência de mercado indisponível nesta análise
      </BaseCard.Title>
      <BaseCard.Subtitle className="mx-auto max-w-md text-xs text-slate-600">
        Oferta máxima, oferta inicial e veredito dependem de uma referência de
        mercado válida. Verifique o aviso da análise acima ou tente outra placa.
      </BaseCard.Subtitle>
    </BaseCard>
  );
}

/** Destaque do teto de compra (oferta máxima) + veredito do motor. */
export function BlocoDecisaoPrincipal({
  temNegociacao,
  ofertaMaxima,
  ofertaInicial,
  veredito,
  meta,
  aguardandoInclusaoFipeMercado,
}: {
  temNegociacao: boolean;
  ofertaMaxima: number | null;
  ofertaInicial: number | null;
  veredito: VereditoViabilidade;
  vendaUltrapassaFipe?: boolean;
  meta: { titulo: string; subtitulo: string };
  aguardandoInclusaoFipeMercado?: boolean;
}) {
  const vereditoCores =
    veredito === "viavel"
      ? "border-emerald-400/40 bg-emerald-950/40 text-emerald-100"
      : veredito === "arriscado"
        ? "border-red-400/40 bg-red-950/35 text-red-100"
        : veredito === "atencao"
          ? "border-amber-400/35 bg-amber-950/30 text-amber-50"
          : "border-slate-500/40 bg-slate-800/80 text-slate-200";

  return (
    <BaseCard
      className="!p-6 border-2 border-slate-900 bg-slate-900 text-center text-white shadow-xl ring-1 ring-slate-800 sm:!p-8"
      data-testid="bloco-decisao-principal"
      gapClass="gap-4"
    >
      <BaseCard.Title className="text-xs font-semibold uppercase tracking-widest text-amber-300/90">
        💰 Preço máximo seguro
      </BaseCard.Title>
      <PriceHero
        valor={
          temNegociacao && ofertaMaxima !== null ? ofertaMaxima : null
        }
      />
      {temNegociacao && ofertaMaxima !== null ? (
        <BaseCard.Subtitle className="mx-auto max-w-md text-xs text-slate-400">
          Acima disso, você começa a assumir prejuízo neste negócio.
        </BaseCard.Subtitle>
      ) : null}
      {!temNegociacao ? (
        <p className="mx-auto max-w-md text-xs text-slate-400">
          {aguardandoInclusaoFipeMercado
            ? "Inclua a referência FIPE na análise (botão na simulação base acima) para ver o teto de compra e o veredito."
            : "Revise lucro, custos e ajuste sobre FIPE — o teto não pôde ser calculado com os dados atuais."}
        </p>
      ) : null}

      <div className="border-t border-white/10 pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Comece oferecendo
        </p>
        <div className="mt-2 flex w-full justify-center">
          <BaseCard.Value className="text-base font-bold text-slate-100 sm:text-lg md:text-xl lg:text-2xl">
            {temNegociacao && ofertaInicial !== null ? (
              <PriceInline
                valor={ofertaInicial}
                className="text-base font-bold text-slate-100 sm:text-lg md:text-xl lg:text-2xl"
              />
            ) : (
              "—"
            )}
          </BaseCard.Value>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border px-4 py-4 text-left",
          vereditoCores
        )}
        data-testid="badge-veredito-viabilidade"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          {veredito === "viavel" ? (
            <CheckCircle2 className="mx-auto size-8 shrink-0 text-emerald-400 sm:mx-0" />
          ) : veredito === "arriscado" ? (
            <AlertTriangle className="mx-auto size-8 shrink-0 text-red-300 sm:mx-0" />
          ) : veredito === "atencao" ? (
            <AlertTriangle className="mx-auto size-8 shrink-0 text-amber-300 sm:mx-0" />
          ) : (
            <AlertTriangle className="mx-auto size-8 shrink-0 text-slate-400 sm:mx-0" />
          )}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="break-words text-pretty font-bold leading-snug">
              {meta.titulo}
            </p>
            <p className="mt-2 break-words text-pretty text-sm leading-relaxed opacity-90">
              {meta.subtitulo}
            </p>
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
