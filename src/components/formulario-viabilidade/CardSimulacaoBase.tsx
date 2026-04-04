"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import { formatarMoedaBRL, formatarPercentual } from "@/lib/viabilidade";
export type SimulacaoBaseState = ReturnType<
  typeof import("@/lib/viabilidade").calcularSimulacaoBase
>;

export type CardSimulacaoBaseProps = {
  simBase: SimulacaoBaseState;
  pctLucro: number;
  fipeDisponivelNaConsulta: boolean;
  onIncluirFipeMercado: () => void;
};

export function CardSimulacaoBase({
  simBase,
  pctLucro,
  fipeDisponivelNaConsulta,
  onIncluirFipeMercado,
}: CardSimulacaoBaseProps) {
  const pctLucroFmt =
    pctLucro % 1 === 0 ? String(pctLucro) : pctLucro.toFixed(1).replace(".", ",");

  return (
    <div
      className="rounded-2xl border-2 border-dashed border-indigo-300/80 bg-gradient-to-br from-indigo-50/90 to-white p-5 shadow-sm ring-1 ring-indigo-100 sm:p-6"
      data-testid="card-simulacao-base"
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-800">
        Simulação base (sem API extra · sem FIPE na decisão)
      </p>

      {simBase.modo === "market_minus" ? (
        <>
          <p className="mt-3 text-sm font-bold leading-relaxed text-slate-900">
            Meta de Compra (Simulação)
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-800">
            Para vender por{" "}
            <span className="font-mono font-bold tabular-nums text-indigo-950">
              {formatarMoedaBRL(simBase.precoVendaSugerido)}
            </span>{" "}
            e ter{" "}
            <span className="font-mono font-semibold tabular-nums">{pctLucroFmt}%</span> de
            lucro, você deve pagar no máximo{" "}
            <span className="font-mono font-bold tabular-nums text-indigo-950">
              {formatarMoedaBRL(simBase.precoCompraAlvo ?? 0)}
            </span>{" "}
            pelo veículo (custos operacionais já descontados da conta).
          </p>
          <div className="mt-4 grid gap-2 rounded-xl border border-indigo-200/80 bg-white/80 px-3 py-3 text-sm text-slate-800">
            <p>
              <span className="font-semibold">Lucro estimado</span> (com essa compra alvo):{" "}
              <span className="font-mono font-bold tabular-nums">
                {formatarMoedaBRL(simBase.lucroEstimado ?? 0)}
              </span>
            </p>
            <p>
              <span className="font-semibold">Margem sobre o custo operacional</span>:{" "}
              <span className="font-mono font-bold tabular-nums">
                {simBase.margemSobreCustosOperacionaisPct === null
                  ? "—"
                  : formatarPercentual(simBase.margemSobreCustosOperacionaisPct)}
              </span>
            </p>
          </div>
        </>
      ) : (
        <>
          <p
            className="mt-3 rounded-lg border border-sky-200/90 bg-sky-50/90 px-3 py-2 text-xs font-medium leading-relaxed text-sky-950"
            role="status"
          >
            Informe o <span className="font-semibold">preço de venda esperado</span> acima para ver a frase com teto de
            compra (meta market-minus). Enquanto isso, usamos apenas custos operacionais × (1 + lucro %).
          </p>
          <p className="mt-4 text-sm font-bold leading-relaxed text-slate-900">
            Meta de Compra (Simulação) — referência custo + lucro %
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-800">
            Com os custos operacionais informados e meta de{" "}
            <span className="font-mono font-semibold tabular-nums">{pctLucroFmt}%</span> de lucro sobre esses custos, a
            venda de referência indicada é{" "}
            <span className="font-mono font-bold tabular-nums text-indigo-950">
              {formatarMoedaBRL(simBase.precoVendaSugerido)}
            </span>
            . Informe também o preço de venda esperado para calcular quanto pode pagar no carro.
          </p>
          {simBase.custoTotal > 0 ? (
            <p className="mt-3 text-sm text-slate-700">
              Margem sobre o custo operacional:{" "}
              <span className="font-mono font-semibold tabular-nums">
                {simBase.margemSobreCustosOperacionaisPct === null
                  ? "—"
                  : formatarPercentual(simBase.margemSobreCustosOperacionaisPct)}
              </span>
            </p>
          ) : null}
        </>
      )}

      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        Vale a pena o negócio dado o que o mercado paga?{" "}
        {fipeDisponivelNaConsulta
          ? "Inclua a referência de mercado na decisão para ver teto de compra e veredito."
          : "Não há referência de mercado válida nesta análise — confira o aviso acima ou os dados da placa."}
      </p>
      {fipeDisponivelNaConsulta ? (
        <>
          <div
            className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-950"
            role="status"
            data-testid="indicador-preco-mercado-incluido"
          >
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" strokeWidth={2} aria-hidden />
            Referência FIPE disponível na consulta
          </div>
          <button
            type="button"
            onClick={onIncluirFipeMercado}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            data-testid="btn-incluir-fipe-mercado"
          >
            <Sparkles className="size-5 shrink-0 opacity-90" strokeWidth={2} />
            Incluir FIPE e mercado na análise
          </button>
        </>
      ) : null}
      <p
        className="mt-4 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs font-medium leading-relaxed text-amber-950"
        role="note"
        data-testid="aviso-feeling-mercado-fipe"
      >
        Esta é uma simulação baseada no seu feeling de mercado. Para validar se este preço de venda é realista, consulte
        a FIPE e Histórico abaixo.
      </p>
    </div>
  );
}
