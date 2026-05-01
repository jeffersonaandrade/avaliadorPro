"use client";

import { Copy } from "lucide-react";
import { useMemo, useState } from "react";

import { BaseCard } from "@/components/ui/BaseCard";
import { PriceInline } from "@/components/ui/PriceDisplay";
import { gerarArgumentoNegociacao } from "@/lib/argumento-negociacao";
import { cn } from "@/lib/cn";
import {
  obterMicrocopyDecisao,
  type EstadoDecisao,
} from "@/lib/microcopy-decisao";
import {
  formatarMoedaBRL,
  formatarPercentual,
  type VereditoViabilidade,
} from "@/lib/viabilidade";

export type DecisionCardProps = {
  contextoAtivo: boolean;
  blindagemAtiva: boolean;
  vereditoUi: VereditoViabilidade;
  semaforoCompleto: boolean;
  riscoEstruturalLeilaoOuSinistro: boolean;
  margemFinanceiraAguardandoCustos: boolean;
  lucroEstimadoReais: number | null;
  margemPct: number | null;
  tetoNegociacaoReais: number | null;
  perdaHistoricoReais: number;
  riscosResumo: string[];
  tendenciaMercado?: {
    tendencia: "subindo" | "caindo" | "estavel";
    variacaoPercentual: number;
    variacaoReais: number;
    insight: string;
  } | null;
};

const bordaTom: Record<
  "ok" | "medio" | "ruim" | "neutro",
  string
> = {
  ok: "border-emerald-500/80 bg-emerald-50 shadow-emerald-100/50",
  medio:
    "border-amber-500/80 bg-amber-50 shadow-amber-100/50",
  ruim: "border-red-500/80 bg-red-50 shadow-red-100/50",
  neutro: "border-slate-300 bg-slate-50",
};

const cabecalhoTom: Record<"ok" | "medio" | "ruim" | "neutro", string> = {
  ok: "bg-emerald-900 text-emerald-50",
  medio: "bg-amber-900 text-amber-50",
  ruim: "bg-red-900 text-red-50",
  neutro: "bg-slate-900 text-slate-50",
};

export function DecisionCard({
  contextoAtivo,
  blindagemAtiva,
  vereditoUi,
  semaforoCompleto,
  riscoEstruturalLeilaoOuSinistro,
  margemFinanceiraAguardandoCustos,
  lucroEstimadoReais,
  margemPct,
  tetoNegociacaoReais,
  perdaHistoricoReais,
  riscosResumo,
  tendenciaMercado = null,
}: DecisionCardProps) {
  if (!contextoAtivo) return null;
  const [copiado, setCopiado] = useState(false);
  const [copiouRecomendacao, setCopiouRecomendacao] = useState(false);
  const [copiouArgumento, setCopiouArgumento] = useState(false);
  const tom: "ok" | "medio" | "ruim" | "neutro" =
    !semaforoCompleto || margemFinanceiraAguardandoCustos
      ? "neutro"
      : vereditoUi === "viavel"
        ? "ok"
        : vereditoUi === "atencao"
          ? "medio"
          : "ruim";
  const estado: EstadoDecisao =
    !blindagemAtiva || !semaforoCompleto || margemFinanceiraAguardandoCustos
      ? "incompleto"
      : tom === "ok"
        ? "verde"
        : tom === "medio"
          ? "amarelo"
          : "vermelho";

  const tetoOk =
    tetoNegociacaoReais !== null &&
    Number.isFinite(tetoNegociacaoReais) &&
    tetoNegociacaoReais > 0;
  const propostaMin = tetoOk ? tetoNegociacaoReais * 0.9 : null;
  const propostaMax = tetoOk ? tetoNegociacaoReais * 0.97 : null;
  const riscosAtivos = useMemo(
    () => riscosResumo.filter((r) => r.trim().length > 0),
    [riscosResumo]
  );
  const microcopy = useMemo(
    () =>
      obterMicrocopyDecisao(
        estado,
        Number.isFinite(perdaHistoricoReais) ? perdaHistoricoReais : undefined,
        riscosAtivos
      ),
    [estado, perdaHistoricoReais, riscosAtivos]
  );
  const estrategiaTexto = useMemo(() => {
    if (!tetoOk || propostaMin === null || propostaMax === null) return "";
    return `Negocie entre ${formatarMoedaBRL(propostaMin)} e ${formatarMoedaBRL(propostaMax)}. Nunca ultrapasse ${formatarMoedaBRL(tetoNegociacaoReais!)}.`;
  }, [tetoOk, propostaMin, propostaMax, tetoNegociacaoReais]);
  const argumentoNegociacao = useMemo(
    () =>
      gerarArgumentoNegociacao({
        estado,
        precoMaximoSeguro: tetoNegociacaoReais,
        faixaInicialMin: propostaMin,
        faixaInicialMax: propostaMax,
        valorEvitarPerda: perdaHistoricoReais,
        riscosResumo: riscosAtivos,
      }),
    [
      estado,
      tetoNegociacaoReais,
      propostaMin,
      propostaMax,
      perdaHistoricoReais,
      riscosAtivos,
    ]
  );

  return (
    <BaseCard
      aria-label="Decisão de compra"
      className={cn(
        "rounded-2xl border-2 shadow-lg !px-4 !py-6 sm:!p-8",
        bordaTom[tom]
      )}
      data-testid="decision-card"
      gapClass="gap-4"
    >
      <div
        className={cn(
          "rounded-2xl border border-black/10 px-4 py-5 text-center shadow-sm",
          cabecalhoTom[tom]
        )}
      >
        <p className="text-2xl font-bold tracking-tight sm:text-3xl">
          {microcopy.titulo}
        </p>
        <p className="mt-1 text-sm font-semibold text-white/90">
          {microcopy.subtitulo}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
          Pague no máximo
        </p>
        <div className="mt-1 text-[clamp(1.8rem,7vw,3rem)] font-extrabold leading-none">
          {tetoOk ? (
            <PriceInline valor={tetoNegociacaoReais} className="font-extrabold" />
          ) : (
            "Informe custos"
          )}
        </div>
      </div>

      <BaseCard className="bg-white/85 !p-4" gapClass="gap-2">
        <BaseCard.Title className="text-xs font-bold uppercase tracking-widest text-slate-600">
          💸 Resumo de impacto
        </BaseCard.Title>
        <ul className="space-y-1 text-sm text-slate-800">
          {microcopy.impacto ? <li>🔥 {microcopy.impacto}</li> : null}
          {microcopy.risco ? <li>⚠️ {microcopy.risco}</li> : null}
          {microcopy.liquidez ? <li>📉 {microcopy.liquidez}</li> : null}
          {blindagemAtiva && perdaHistoricoReais > 0 && estado !== "verde" ? (
            <li className="font-semibold text-red-700">
              Se pagar FIPE, voce provavelmente vai sair no prejuizo.
            </li>
          ) : null}
          <li className="font-semibold text-slate-900">{microcopy.recomendacao}</li>
        </ul>
      </BaseCard>

      {tetoOk && propostaMin !== null && propostaMax !== null ? (
        <BaseCard className="bg-white/85 !p-4" gapClass="gap-2">
          <BaseCard.Title className="text-xs font-bold uppercase tracking-widest text-slate-600">
            🎯 Estratégia
          </BaseCard.Title>
          <p className="text-sm font-semibold text-slate-900">
            Negocie entre{" "}
            <span className="whitespace-nowrap tabular-nums">
              {formatarMoedaBRL(propostaMin)}
            </span>{" "}
            e{" "}
            <span className="whitespace-nowrap tabular-nums">
              {formatarMoedaBRL(propostaMax)}
            </span>
          </p>
          <p className="text-sm font-bold text-red-700">
            Nunca ultrapasse{" "}
            <span className="whitespace-nowrap tabular-nums">
              {formatarMoedaBRL(tetoNegociacaoReais)}
            </span>
          </p>
          <button
            type="button"
            onClick={async () => {
              if (!estrategiaTexto) return;
              await navigator.clipboard.writeText(estrategiaTexto);
              setCopiado(true);
              window.setTimeout(() => setCopiado(false), 1500);
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
          >
            <Copy className="size-4" /> {copiado ? "Copiado" : "Copiar estratégia"}
          </button>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(microcopy.recomendacao);
              setCopiouRecomendacao(true);
              window.setTimeout(() => setCopiouRecomendacao(false), 1500);
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
          >
            {copiouRecomendacao ? "Recomendação copiada" : "Copiar recomendação"}
          </button>
        </BaseCard>
      ) : null}

      <BaseCard className="bg-white/90 !p-4" gapClass="gap-2">
        <BaseCard.Title className="text-xs font-bold uppercase tracking-widest text-slate-600">
          Argumento para negociação
        </BaseCard.Title>
        <p className="text-sm font-semibold text-slate-900">
          {argumentoNegociacao.titulo}
        </p>
        <p className="text-sm leading-relaxed text-slate-700">
          {argumentoNegociacao.textoCurto}
        </p>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(argumentoNegociacao.mensagemCopiavel);
            setCopiouArgumento(true);
            window.setTimeout(() => setCopiouArgumento(false), 1500);
          }}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
        >
          {copiouArgumento ? "Argumento copiado" : "Copiar argumento"}
        </button>
      </BaseCard>

      {lucroEstimadoReais !== null && Number.isFinite(lucroEstimadoReais) ? (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm">
          <span className="font-semibold text-slate-700">Lucro estimado</span>
          <PriceInline valor={lucroEstimadoReais} className="font-bold" />
        </div>
      ) : null}
      {margemPct !== null && Number.isFinite(margemPct) ? (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm">
          <span className="font-semibold text-slate-700">Margem</span>
          <span className="font-bold tabular-nums text-slate-900">
            {formatarPercentual(margemPct, 1)}
          </span>
        </div>
      ) : null}

      {tendenciaMercado ? (
        <BaseCard
          className="border border-slate-200 bg-slate-50/80 !p-4 sm:!p-5"
          gapClass="gap-2"
          data-testid="bloco-tendencia-fipe"
        >
          <BaseCard.Title className="text-xs font-bold uppercase tracking-widest text-slate-600">
            📊 Tendencia de mercado
          </BaseCard.Title>
          <p className="text-sm font-semibold text-slate-900">
            {tendenciaMercado.tendencia === "caindo"
              ? "📉 Queda"
              : tendenciaMercado.tendencia === "subindo"
                ? "📈 Alta"
                : "➡️ Estavel"}{" "}
            de {formatarPercentual(tendenciaMercado.variacaoPercentual, 1)} no
            ultimo ano
          </p>
          <p className="text-sm font-medium text-slate-700">
            <PriceInline valor={tendenciaMercado.variacaoReais} /> no periodo
          </p>
          <p className="text-sm leading-relaxed text-slate-700">
            {tendenciaMercado.insight}
          </p>
        </BaseCard>
      ) : null}
    </BaseCard>
  );
}
