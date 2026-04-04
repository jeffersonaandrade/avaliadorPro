"use client";

import type { RiscosCarregadosMap, TipoConsultaRiscoPremium } from "@/lib/consultas-risco-premium";
import { CONSULTAS_RISCO_PREMIUM_UI } from "./constants";

export type ConsultasRiscoPremiumSectionProps = {
  creditosPremium: number;
  riscosCarregados: RiscosCarregadosMap;
  consultandoRiscoTipo: TipoConsultaRiscoPremium | null;
  /** Aviso: mock/placa teste — botões permanecem ativos; resposta simulada após o fluxo PIX. */
  sandboxPremiumAviso?: boolean;
  onAbrirModal: (tipo: TipoConsultaRiscoPremium, precoLabel: string) => void;
};

export function ConsultasRiscoPremiumSection({
  creditosPremium,
  riscosCarregados,
  consultandoRiscoTipo,
  sandboxPremiumAviso = false,
  onAbrirModal,
}: ConsultasRiscoPremiumSectionProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="card-consultas-risco-premium">
      {sandboxPremiumAviso ? (
        <p
          className="rounded-lg border border-violet-300/80 bg-violet-50/95 px-3 py-2 text-center text-xs font-semibold leading-snug text-violet-950"
          role="status"
          data-testid="aviso-riscos-sandbox-premium"
        >
          <span className="whitespace-nowrap">Modo sandbox / demonstração:</span> use{" "}
          <strong>Consultar</strong> normalmente. A resposta é <strong>simulada</strong>{" "}
          após &quot;Já paguei&quot;, sem API paga nem débito real de crédito.
        </p>
      ) : null}
      <p
        className="rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-3 py-2 text-center text-sm font-semibold text-emerald-950"
        role="status"
        data-testid="badge-creditos-premium"
      >
        Você possui{" "}
        <span className="font-mono tabular-nums">{creditosPremium}</span> crédito
        {creditosPremium === 1 ? "" : "s"} disponíve{creditosPremium === 1 ? "l" : "is"}
      </p>
      <p
        className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-center text-xs font-medium leading-snug text-amber-950"
        role="note"
        data-testid="aviso-calculo-sem-riscos-ocultos"
      >
        ⚠️ Cada análise premium consome 1 crédito (exceto quando o mesmo tipo já foi analisado para esta placa). O
        resultado positivo reduz a referência de mercado na análise.
      </p>
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/90 p-5 shadow-md ring-1 ring-slate-100 sm:p-6">
          <h4 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            Análises premium por tipo
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Pague só o que precisar. Após o PIX, rodamos a análise (simulação) e gravamos o resultado nesta placa.
          </p>
        <ul className="mt-4 space-y-3">
          {CONSULTAS_RISCO_PREMIUM_UI.map(({ tipo, titulo, precoLabel }) => {
            const feito = riscosCarregados[tipo];
            return (
              <li
                key={tipo}
                className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{titulo}</p>
                  <p className="text-xs text-slate-500">{precoLabel}</p>
                  {feito ? (
                    <p className="mt-2 text-xs font-medium leading-snug text-slate-700">
                      {feito.constatado ? "⚠️ Indício positivo" : "✓ Sem ocorrência"} — {feito.resumo}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  data-testid={`btn-consulta-risco-${tipo}`}
                  disabled={Boolean(feito) || consultandoRiscoTipo === tipo}
                  onClick={() => onAbrirModal(tipo, precoLabel)}
                  className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                >
                  {feito ? "Consultado" : "Consultar"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
