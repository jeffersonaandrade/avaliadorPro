"use client";

import { formatarMoedaBRL, formatarPercentual } from "@/lib/viabilidade";

export type ResumoDecisaoProps = {
  exibirBlocoResumo: boolean;
  resumoComRiscoVisual: boolean;
  fipeCarregada: boolean;
  fipeValidaParaAjuste: boolean;
  fipeReferenciaReais: number;
  baseVenda: number;
  exibirComparativoNegociacao: boolean;
  ofertaMaximaNum: number;
  pctBarTeto: number;
  pctBarPedido: number;
  precoPedidoReais: number;
  acimaDoTeto: boolean;
  deltaNegociacao: number;
  lucroIdealSimulado: number | null;
  exibirLinhasLucroCenario: boolean;
  prejuizoPessimista: boolean;
  lucroBase: number;
  lucroPessimista: number;
  temRiscoEstrutural: boolean;
  margemPessimistaPct: number | null;
};

export function ResumoDecisao({
  exibirBlocoResumo,
  resumoComRiscoVisual,
  fipeCarregada,
  fipeValidaParaAjuste,
  fipeReferenciaReais,
  baseVenda,
  exibirComparativoNegociacao,
  ofertaMaximaNum,
  pctBarTeto,
  pctBarPedido,
  precoPedidoReais,
  acimaDoTeto,
  deltaNegociacao,
  lucroIdealSimulado,
  exibirLinhasLucroCenario,
  prejuizoPessimista,
  lucroBase,
  lucroPessimista,
  temRiscoEstrutural,
  margemPessimistaPct,
}: ResumoDecisaoProps) {
  if (!exibirBlocoResumo) return null;

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ring-1 ${
        resumoComRiscoVisual
          ? "border-red-300 bg-red-50 ring-red-100/80"
          : "border-indigo-200 bg-indigo-50/60 ring-indigo-100/80"
      }`}
      data-testid="resumo-decisao"
    >
      <p
        className={`text-xs font-bold uppercase tracking-wide ${
          resumoComRiscoVisual ? "text-red-800" : "text-indigo-700"
        }`}
      >
        Resumo da decisão
      </p>

      {fipeCarregada && fipeValidaParaAjuste ? (
        <p
          className={`mt-3 text-sm font-medium ${
            resumoComRiscoVisual ? "text-red-950" : "text-indigo-950"
          }`}
        >
          <span className="font-semibold">Referência FIPE (tabela):</span>{" "}
          <span className="font-mono font-bold tabular-nums">
            {formatarMoedaBRL(fipeReferenciaReais)}
          </span>
          {" · "}
          <span className="font-semibold">Venda realista de mercado:</span>{" "}
          <span className="font-mono font-bold tabular-nums">
            {formatarMoedaBRL(baseVenda)}
          </span>
        </p>
      ) : null}

      {exibirComparativoNegociacao ? (
        <div
          className={`mt-4 rounded-xl border p-3 ${
            resumoComRiscoVisual
              ? "border-red-200/90 bg-white/60"
              : "border-indigo-200/80 bg-white/70"
          }`}
          data-testid="resumo-pedido-vs-teto"
        >
          <p
            className={`text-[11px] font-bold uppercase tracking-wide ${
              resumoComRiscoVisual ? "text-red-800" : "text-indigo-700"
            }`}
          >
            Comparativo: o que você pode pagar × o que pediram
          </p>
          <p
            className={`mt-1 text-xs leading-relaxed ${
              resumoComRiscoVisual ? "text-red-900/85" : "text-indigo-900/75"
            }`}
          >
            O foco é o <span className="font-semibold">teto de compra</span> (limite seguro). O pedido do vendedor só
            entra para medir distância até esse teto.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <div
                className={`flex flex-wrap items-baseline justify-between gap-2 text-[10px] font-bold uppercase tracking-wide ${
                  resumoComRiscoVisual ? "text-red-900" : "text-indigo-900"
                }`}
              >
                <span>Teto de compra (limite seguro)</span>
                <span className="font-mono text-sm tabular-nums text-slate-900">
                  {formatarMoedaBRL(ofertaMaximaNum)}
                </span>
              </div>
              <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-200/90">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-[width] duration-300"
                  style={{ width: `${pctBarTeto}%` }}
                />
              </div>
            </div>
            <div>
              <div
                className={`flex flex-wrap items-baseline justify-between gap-2 text-[10px] font-bold uppercase tracking-wide ${
                  resumoComRiscoVisual ? "text-red-900" : "text-slate-600"
                }`}
              >
                <span>Preço pedido pelo vendedor</span>
                <span className="font-mono text-sm tabular-nums text-slate-900">
                  {precoPedidoReais > 0 ? formatarMoedaBRL(precoPedidoReais) : "—"}
                </span>
              </div>
              <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-200/90">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    acimaDoTeto && precoPedidoReais > 0 ? "bg-red-500" : "bg-slate-500"
                  }`}
                  style={{ width: `${pctBarPedido}%` }}
                />
              </div>
            </div>
          </div>

          {precoPedidoReais > 0 ? (
            <p
              className={`mt-4 text-sm font-medium ${
                resumoComRiscoVisual ? "text-red-950" : "text-slate-800"
              }`}
              data-testid="delta-negociacao"
            >
              <span className="font-semibold">Delta de negociação:</span>{" "}
              <span className="font-mono font-bold tabular-nums">
                {formatarMoedaBRL(Math.abs(deltaNegociacao))}
              </span>
              {deltaNegociacao > 0
                ? " acima do teto (inseguro)"
                : deltaNegociacao < 0
                  ? " abaixo do teto (folga)"
                  : " igual ao teto"}
            </p>
          ) : (
            <p
              className={`mt-4 text-xs leading-relaxed ${
                resumoComRiscoVisual ? "text-red-900/80" : "text-slate-600"
              }`}
            >
              Informe o preço pedido pelo vendedor para ver o delta em relação ao teto.
            </p>
          )}

          {lucroIdealSimulado !== null && Number.isFinite(lucroIdealSimulado) ? (
            <p
              className={`mt-3 border-t pt-3 text-xs leading-relaxed ${
                resumoComRiscoVisual
                  ? "border-red-200/80 text-red-900/85"
                  : "border-indigo-200/80 text-indigo-900/80"
              }`}
            >
              <span className="font-semibold">Hipótese (compra no teto):</span> se você comprasse na oferta máxima e
              vendesse à venda realista de mercado, o lucro seria aproximadamente{" "}
              <span className="font-mono font-bold tabular-nums">
                {formatarMoedaBRL(lucroIdealSimulado)}
              </span>{" "}
              (simulação — não substitui seus custos reais de aquisição).
            </p>
          ) : null}
        </div>
      ) : null}

      {exibirLinhasLucroCenario ? (
        <>
          <p
            className={`mt-4 text-sm leading-snug ${
              resumoComRiscoVisual ? "text-red-950" : "text-indigo-900"
            }`}
          >
            {prejuizoPessimista
              ? "Há risco de prejuízo no cenário conservador."
              : "A operação mantém lucro mesmo em cenário conservador."}
          </p>
          <p
            className={`mt-3 flex min-w-0 flex-col gap-2 font-mono text-sm font-bold tabular-nums tracking-tight sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3 ${
              resumoComRiscoVisual ? "text-red-950" : "text-indigo-950"
            }`}
          >
            <span className="min-w-0 whitespace-nowrap">
              Lucro esperado: {formatarMoedaBRL(lucroBase)}
            </span>
            <span
              className={`hidden sm:inline ${resumoComRiscoVisual ? "text-red-300" : "text-indigo-300"}`}
              aria-hidden
            >
              |
            </span>
            <span className="min-w-0 whitespace-nowrap">
              Pior cenário: {formatarMoedaBRL(lucroPessimista)}
            </span>
          </p>
          <p
            className={`mt-3 text-sm leading-snug ${
              resumoComRiscoVisual ? "text-red-950/90" : "text-indigo-900/85"
            }`}
          >
            <span className="font-semibold">Base de venda (mercado):</span> referência FIPE (tabela) × (1 + ajuste % +
            impacto de riscos do histórico, quando houver); no conservador aplicamos
            {temRiscoEstrutural
              ? " −5% na venda e +5% nos custos operacionais."
              : " −10% na venda e +10% nos custos operacionais."}
          </p>
          {margemPessimistaPct !== null ? (
            <p
              className={`mt-2 text-sm ${
                resumoComRiscoVisual ? "text-red-900/90" : "text-indigo-800/90"
              }`}
            >
              Margem no pior cenário: {formatarPercentual(margemPessimistaPct)}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
