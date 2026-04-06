"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";

import {
  formatarMoedaBRL,
  formatarPercentual,
  type VereditoViabilidade,
} from "@/lib/viabilidade";

export type DecisionCardProps = {
  contextoAtivo: boolean;
  /** Blindagem completa (premium) realizada para a placa. */
  blindagemAtiva: boolean;
  vereditoUi: VereditoViabilidade;
  semaforoCompleto: boolean;
  /** Leilão ou sinistro (perda total) na blindagem — veredito estrutural imediato. */
  riscoEstruturalLeilaoOuSinistro: boolean;
  /** Reparos, docs e custos operacionais todos zerados — mensagem de margem pendente. */
  margemFinanceiraAguardandoCustos: boolean;
  lucroEstimadoReais: number | null;
  margemPct: number | null;
  /** Já limitado à venda realista de decisão. */
  tetoNegociacaoReais: number | null;
  baseVendaExibida: number;
  /** Perda em R$ só com histórico validado (FIPE tabela vs ajustada por risco). */
  perdaHistoricoReais: number;
};

function tituloVeredito(
  blindagemAtiva: boolean,
  riscoEstrutural: boolean,
  margemAguardandoCustos: boolean,
  veredito: VereditoViabilidade,
  semaforoCompleto: boolean
): { linha1: string; emoji: string; tom: "ok" | "medio" | "ruim" | "neutro" } {
  if (!blindagemAtiva) {
    return {
      linha1: "Análise de risco incompleta",
      emoji: "⚠️",
      tom: "neutro",
    };
  }
  if (riscoEstrutural) {
    return {
      linha1: "NÃO RECOMENDADO — RISCO ESTRUTURAL",
      emoji: "🔴",
      tom: "ruim",
    };
  }
  if (margemAguardandoCustos) {
    return {
      linha1: "Aguardando dados de custo",
      emoji: "⏳",
      tom: "neutro",
    };
  }
  if (!semaforoCompleto) {
    return {
      linha1: "Complete os dados de custo",
      emoji: "⚪",
      tom: "neutro",
    };
  }
  switch (veredito) {
    case "viavel":
      return { linha1: "RECOMENDADO", emoji: "🟢", tom: "ok" };
    case "atencao":
      return { linha1: "ATENÇÃO", emoji: "🟡", tom: "medio" };
    case "arriscado":
      return { linha1: "NÃO RECOMENDADO", emoji: "🔴", tom: "ruim" };
    default:
      return { linha1: "Decisão em análise", emoji: "⚪", tom: "neutro" };
  }
}

const bordaTom: Record<
  "ok" | "medio" | "ruim" | "neutro",
  string
> = {
  ok: "border-emerald-400/60 bg-gradient-to-br from-emerald-50 to-white shadow-emerald-100/50",
  medio:
    "border-amber-400/60 bg-gradient-to-br from-amber-50 to-white shadow-amber-100/50",
  ruim: "border-red-400/60 bg-gradient-to-br from-red-50 to-white shadow-red-100/50",
  neutro: "border-slate-300 bg-gradient-to-br from-slate-50 to-white",
};

/**
 * BLOCO 1 — Decisão (acima da dobra): veredito, lucro, margem, teto, impacto R$ (se blindado).
 */
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
  baseVendaExibida,
  perdaHistoricoReais,
}: DecisionCardProps) {
  if (!contextoAtivo) return null;

  const { linha1, emoji, tom } = tituloVeredito(
    blindagemAtiva,
    riscoEstruturalLeilaoOuSinistro,
    margemFinanceiraAguardandoCustos,
    vereditoUi,
    semaforoCompleto
  );

  const exibirLucroMargemNumeros =
    semaforoCompleto && !margemFinanceiraAguardandoCustos;

  return (
    <section
      className={`rounded-3xl border-2 p-6 shadow-lg sm:p-8 ${bordaTom[tom]}`}
      data-testid="decision-card"
      aria-label="Decisão de compra"
    >
      <div className="text-center">
        {!blindagemAtiva ? (
          <p
            className="mx-auto mb-3 inline-flex items-center justify-center rounded-full border border-amber-300/90 bg-amber-100/90 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-950"
            data-testid="selo-risco-incompleto"
          >
            Análise de risco incompleta
          </p>
        ) : null}
        <p className="text-4xl leading-none sm:text-5xl" aria-hidden>
          {emoji}
        </p>
        <p className="mt-3 text-xl font-black uppercase tracking-tight text-slate-900 sm:text-2xl">
          {linha1}
        </p>
        {!blindagemAtiva ? (
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Valores abaixo usam referência de mercado e custos informados; a
            blindagem valida leilão, sinistro, gravame e mais para fechar o
            risco oculto.
          </p>
        ) : null}
        {blindagemAtiva && riscoEstruturalLeilaoOuSinistro ? (
          <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-red-900/90">
            Leilão ou sinistro (perda total) identificado na blindagem — risco
            estrutural elevado para a valorização do veículo.
          </p>
        ) : null}
        {blindagemAtiva && margemFinanceiraAguardandoCustos ? (
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Margem financeira:</span>{" "}
            aguardando dados de custo (reparos, documentação e demais itens) para
            calcular lucro e margem com precisão.
          </p>
        ) : null}
      </div>

      <div className="mt-10 grid gap-5 border-t border-slate-200/80 pt-10 sm:grid-cols-2 sm:gap-6">
        <div className="rounded-2xl bg-white/90 p-5 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Lucro estimado
          </p>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">
            {exibirLucroMargemNumeros &&
            lucroEstimadoReais !== null &&
            Number.isFinite(lucroEstimadoReais)
              ? formatarMoedaBRL(lucroEstimadoReais)
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-white/90 p-5 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Margem (%)
          </p>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">
            {exibirLucroMargemNumeros &&
            margemPct !== null &&
            Number.isFinite(margemPct)
              ? formatarPercentual(margemPct, 1)
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-9 rounded-2xl border border-slate-900 bg-slate-900 p-6 text-center text-white shadow-inner sm:mt-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Não pague mais que
        </p>
        <p className="mt-2 text-3xl font-black tabular-nums sm:text-4xl">
          {tetoNegociacaoReais !== null && Number.isFinite(tetoNegociacaoReais)
            ? formatarMoedaBRL(tetoNegociacaoReais)
            : "—"}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Limite alinhado à venda realista de{" "}
          <span className="font-mono font-semibold text-slate-200">
            {formatarMoedaBRL(baseVendaExibida)}
          </span>{" "}
          (menor entre sua venda esperada e a referência ajustada por risco).
        </p>
      </div>

      {blindagemAtiva && perdaHistoricoReais > 0 ? (
        <div className="mt-9 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 sm:mt-10">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            <span className="font-bold">Você evitou uma perda de </span>
            <span className="font-mono font-bold tabular-nums">
              {formatarMoedaBRL(perdaHistoricoReais)}
            </span>
            <span className="font-bold"> neste negócio</span>
            <span className="block mt-2 text-xs font-normal text-amber-900/90">
              Esse valor reflete a diferença entre a referência FIPE (tabela) e a
              referência ajustada pelos indícios validados na blindagem — em reais,
              para defender sua margem.
            </span>
          </p>
        </div>
      ) : null}

      {blindagemAtiva && perdaHistoricoReais <= 0 ? (
        <div className="mt-9 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950 sm:mt-10">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            <span className="font-bold">Histórico validado</span>
            <span className="block mt-1 text-xs font-normal text-emerald-900/90">
              Nenhuma perda relevante de valor de mercado identificada pelos
              itens da blindagem nesta placa.
            </span>
          </p>
        </div>
      ) : null}
    </section>
  );
}
