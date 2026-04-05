"use client";

import { CircleHelp, Handshake } from "lucide-react";
import { legendaCls } from "./ui-utils";

export type CardEstrategiaNegociacaoProps = {
  temNegociacao: boolean;
  pctLucro: number;
  pctGordura: number;
  formulasNegociacaoVisiveis: boolean;
  onToggleFormulas: () => void;
  fipeDisponivelNaConsulta: boolean;
  fipeCarregada: boolean;
};

export function CardEstrategiaNegociacao({
  temNegociacao,
  pctLucro,
  pctGordura,
  formulasNegociacaoVisiveis,
  onToggleFormulas,
  fipeDisponivelNaConsulta,
  fipeCarregada,
}: CardEstrategiaNegociacaoProps) {
  const pctLucroFmt =
    pctLucro % 1 === 0 ? String(pctLucro) : pctLucro.toFixed(1).replace(".", ",");

  if (temNegociacao) {
    return (
      <div
        className="min-w-0 max-w-full overflow-hidden rounded-2xl border-2 border-violet-300/80 bg-gradient-to-br from-violet-50 via-white to-indigo-50/90 p-5 shadow-md ring-1 ring-violet-100 sm:p-6"
        data-testid="card-estrategia-negociacao"
      >
        <div className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
            <Handshake className="size-7" strokeWidth={2} />
          </div>
          <div className="min-w-0 max-w-full overflow-hidden">
            <h4 className="text-base font-bold tracking-tight text-violet-950 sm:text-lg">
              Estratégia de negociação
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-violet-900/80 sm:text-sm">
              O limite sugerido (“não pague mais que”) usa a FIPE com seu ajuste opcional de mercado; custos operacionais
              informados, lucro desejado ({pctLucroFmt}% sobre esses custos) e gordura de negociação ({pctGordura}% entre
              esse limite e a oferta inicial). O destaque da decisão reflete o que você definiu nos campos.
            </p>
            <button
              type="button"
              onClick={onToggleFormulas}
              title="Mostra como calculamos oferta máxima e inicial a partir da FIPE e dos seus percentuais."
              className="mt-3 inline-flex items-center gap-1.5 text-left text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-700 hover:decoration-slate-400"
              data-testid="btn-ver-formula-negociacao"
            >
              <CircleHelp className="size-3.5 shrink-0" strokeWidth={2} />
              {formulasNegociacaoVisiveis ? "Ocultar fórmula" : "Ver fórmula"}
            </button>
            {formulasNegociacaoVisiveis ? (
              <div
                className="mt-2 max-w-full overflow-hidden rounded-lg border border-violet-200/90 bg-white/90 p-3 text-slate-500 shadow-sm"
                role="region"
                aria-label="Fórmulas da estratégia de negociação"
              >
                <p className="font-mono text-[11px] leading-relaxed text-slate-600 sm:text-xs">
                  FIPE para negociação = Referência FIPE (tabela) × (1 + Ajuste%)
                </p>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-600 sm:text-xs">
                  Não pague mais que = (FIPE para negociação ÷ (1 + Lucro%)) − Custos extras
                </p>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-600 sm:text-xs">
                  Custos extras = Reparos + Transporte + Documentação + Outros custos
                </p>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-600 sm:text-xs">
                  Comece oferecendo = limite sugerido − % de gordura (sobre o limite)
                </p>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                  = Limite sugerido × (1 − Gordura%)
                </p>
                <p className={`mt-2 border-t border-violet-100 pt-2 ${legendaCls}`}>
                  A gordura é aplicada em cima da oferta máxima, sem alterar sua meta de lucro sobre o custo total.
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          Os valores principais estão no bloco escuro acima. Aqui você confere o contexto da FIPE e pode abrir a fórmula
          para validar a conta.
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-w-0 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-600"
      data-testid="card-estrategia-negociacao-vazio"
    >
      <p className="font-medium text-slate-700">Estratégia de negociação</p>
      <p className="mt-1 text-xs leading-relaxed">
        {!fipeDisponivelNaConsulta
          ? "Inclua a referência de mercado na análise quando disponível para ver teto, oferta inicial e fórmulas."
          : !fipeCarregada
            ? "Inclua a referência na análise (botão na simulação base) para ver teto, oferta inicial e fórmulas."
            : "Indisponível sem referência de mercado válida para calcular oferta máxima e ancoragem."}
      </p>
    </div>
  );
}
