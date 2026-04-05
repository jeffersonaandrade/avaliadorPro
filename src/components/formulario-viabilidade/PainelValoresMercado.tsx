"use client";

import {
  formatarMoedaBRL,
  formatarPercentual,
} from "@/lib/viabilidade";
import type { ResultadoViabilidade } from "@/lib/viabilidade";
import { ValorEmLinha } from "./campos-ui";
import type { SimulacaoBaseState } from "./CardSimulacaoBase";

/** Decomposição da “venda realista” = FIPE × (1 + ajuste/100 + Σ fatores risco). */
export type FormulaVendaRealistaDetalhe = {
  fipeRef: number;
  /** 1 + ajusteDecimal + impactoRisco (já com piso 0,5 no fator). */
  multiplicador: number;
  ajustePct: number;
  impactoRiscoDecimal: number;
  impactoRiscoBruto: number;
  resultado: number;
};

function formatarDecimalPt(n: number, casas = 3): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(casas).replace(".", ",");
}

export type PainelValoresMercadoProps = {
  temNegociacao: boolean;
  resultado: ResultadoViabilidade;
  simBase: SimulacaoBaseState;
  fipeCarregada: boolean;
  baseVenda: number;
  margemRealMercadoVsFipePct: number | null;
  formulaVendaRealista?: FormulaVendaRealistaDetalhe | null;
  /** Teto exibido (pode estar limitado à venda realista de decisão). */
  ofertaMaximaExibicao?: number | null;
  /** Referência FIPE × ajustes antes do teto por venda esperada menor. */
  vendaFipeAjustadaReais?: number | null;
};

export function PainelValoresMercado({
  temNegociacao,
  resultado,
  simBase,
  fipeCarregada,
  baseVenda,
  margemRealMercadoVsFipePct,
  formulaVendaRealista = null,
  ofertaMaximaExibicao = null,
  vendaFipeAjustadaReais = null,
}: PainelValoresMercadoProps) {
  const tetoNegociacaoExibido =
    ofertaMaximaExibicao !== null && ofertaMaximaExibicao !== undefined
      ? ofertaMaximaExibicao
      : resultado.ofertaMaximaSugerida;
  const impactoClampado =
    formulaVendaRealista &&
    formulaVendaRealista.impactoRiscoBruto !==
      formulaVendaRealista.impactoRiscoDecimal;
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-4 overflow-hidden">
      {temNegociacao && tetoNegociacaoExibido !== null ? (
        <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border-2 border-indigo-400/50 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-md ring-1 ring-indigo-100">
          <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-indigo-700 sm:tracking-widest">
            Não pague mais que (referência rápida)
          </p>
          <ValorEmLinha className="mt-2 text-base text-indigo-950 sm:text-lg md:text-xl lg:text-2xl">
            {formatarMoedaBRL(tetoNegociacaoExibido)}
          </ValorEmLinha>
          <p className="mt-1 text-[11px] leading-snug text-slate-600">
            Mesmo valor do bloco escuro — o dado principal para decidir quanto pode pagar.
          </p>
        </div>
      ) : null}
      <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-md">
        <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-400 sm:tracking-widest">
          Custo total operacional
        </p>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          Reparos + transporte + documentação + outros (sem o preço pedido pelo vendedor).
        </p>
        <ValorEmLinha className="mt-2 text-base text-slate-900 sm:text-lg md:text-xl lg:text-2xl">
          {formatarMoedaBRL(resultado.custoTotal)}
        </ValorEmLinha>
      </div>
      <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border-2 border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white p-5 shadow-md ring-1 ring-emerald-100">
        <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-emerald-800 sm:tracking-widest">
          {fipeCarregada ? "Venda realista de mercado" : "Meta de Compra (Simulação)"}
        </p>
        <ValorEmLinha className="mt-2 text-base text-emerald-950 sm:text-lg md:text-xl lg:text-2xl">
          {fipeCarregada
            ? formatarMoedaBRL(baseVenda)
            : simBase.modo === "market_minus"
              ? formatarMoedaBRL(simBase.precoCompraAlvo ?? 0)
              : formatarMoedaBRL(baseVenda)}
        </ValorEmLinha>
        {fipeCarregada &&
        vendaFipeAjustadaReais !== null &&
        Math.abs(vendaFipeAjustadaReais - baseVenda) > 0.009 ? (
          <p
            className="mt-2 rounded-lg border border-sky-200/90 bg-sky-50/90 px-3 py-2 text-[11px] leading-relaxed text-sky-950"
            role="note"
          >
            Na decisão usamos o menor entre sua venda esperada e a referência
            ajustada (
            <span className="font-mono font-semibold tabular-nums">
              {formatarMoedaBRL(vendaFipeAjustadaReais)}
            </span>
            ) — valor aplicado:{" "}
            <span className="font-mono font-semibold tabular-nums">
              {formatarMoedaBRL(baseVenda)}
            </span>
            .
          </p>
        ) : null}
        <p className="mt-1 text-[11px] leading-snug text-emerald-900/80">
          {fipeCarregada
            ? "Fórmula: valor FIPE da consulta × (1 + ajuste manual em decimal + soma dos impactos de histórico/leilão/sinistro etc., também em decimal). O resultado é arredondado a 2 casas."
            : simBase.modo === "market_minus"
              ? `Com venda esperada de ${formatarMoedaBRL(simBase.precoVendaSugerido)} e meta de lucro informada em “Ajustar estratégia”.`
              : "Referência custo + lucro % — informe venda esperada para ver quanto pode pagar no veículo."}
        </p>
        {fipeCarregada && formulaVendaRealista ? (
          <div
            className="mt-2 space-y-1.5 rounded-lg border border-emerald-200/80 bg-white/80 px-3 py-2 text-[11px] leading-relaxed text-emerald-950"
            data-testid="detalhe-formula-venda-realista"
          >
            <p className="font-semibold text-emerald-900">
              <span className="font-mono tabular-nums">
                {formatarMoedaBRL(formulaVendaRealista.fipeRef)}
              </span>
              {" × "}
              <span className="font-mono tabular-nums">
                {formatarDecimalPt(formulaVendaRealista.multiplicador)}
              </span>
              {" ≈ "}
              <span className="font-mono tabular-nums">
                {formatarMoedaBRL(formulaVendaRealista.resultado)}
              </span>
            </p>
            <p className="text-[10px] text-emerald-800/90">
              Multiplicador = 1 + {formatarDecimalPt(formulaVendaRealista.ajustePct / 100)} (
              ajuste {formatarPercentual(formulaVendaRealista.ajustePct)}) +{" "}
              {formatarDecimalPt(formulaVendaRealista.impactoRiscoDecimal)} (histórico{" "}
              {formatarPercentual(formulaVendaRealista.impactoRiscoDecimal * 100)}).
              {impactoClampado ? (
                <>
                  {" "}
                  A soma bruta dos riscos foi limitada a{" "}
                  <span className="font-semibold">−50 p.p.</span> (−0,50 em decimal no termo
                  “histórico”).
                </>
              ) : null}
            </p>
          </div>
        ) : null}
        {fipeCarregada ? (
          <p
            className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-950"
            role="note"
            data-testid="aviso-feeling-mercado-fipe-incluso"
          >
            Esta é uma simulação baseada no seu feeling de mercado. Para validar se este preço de venda é realista,
            consulte a FIPE e Histórico abaixo.
          </p>
        ) : null}
      </div>
      {fipeCarregada ? (
        <details className="group min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/80 shadow-sm ring-1 ring-slate-100 [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer list-none p-4 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:tracking-widest">
              Meta interna (custos + lucro %)
            </p>
            <p className="mt-1 text-xs text-slate-600">
              O que custos + sua meta de lucro indicam — compare com a venda realista de mercado acima.
            </p>
            <p className="mt-2 font-mono text-lg font-bold tabular-nums text-slate-800">
              {formatarMoedaBRL(resultado.precoVendaSugerido)}
            </p>
            <span className="mt-2 inline-block text-xs font-medium text-indigo-600 underline decoration-indigo-200 group-open:hidden">
              Ver detalhes
            </span>
            <span className="mt-2 hidden text-xs font-medium text-slate-500 group-open:inline">
              Ocultar
            </span>
          </summary>
          <div className="border-t border-slate-200/80 px-4 pb-4 pt-2 text-xs leading-relaxed text-slate-600">
            Calculado no motor como custos operacionais × (1 + lucro desejado). Serve para conferir sua meta interna
            frente ao limite sugerido (não pague mais que) e à venda realista de mercado.
          </div>
        </details>
      ) : null}
      <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-md">
        <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-400 sm:tracking-widest">
          Margem vs referência FIPE (tabela)
        </p>
        <ValorEmLinha className="mt-2 text-base text-slate-900 sm:text-lg md:text-xl lg:text-2xl">
          {margemRealMercadoVsFipePct === null
            ? "—"
            : formatarPercentual(margemRealMercadoVsFipePct)}
        </ValorEmLinha>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          {fipeCarregada
            ? "Diferença % da venda realista de mercado em relação à referência FIPE (tabela)"
            : "Inclua a referência FIPE na decisão para comparar sua meta com a tabela."}
        </p>
      </div>
    </div>
  );
}
