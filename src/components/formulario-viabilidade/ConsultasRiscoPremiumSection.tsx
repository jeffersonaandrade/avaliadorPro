"use client";

import { useState } from "react";

import type {
  RiscosCarregadosMap,
  TipoConsultaRiscoPremium,
} from "@/lib/consultas-risco-premium";
import { BLINDAGEM_TIPOS_UI } from "./constants";
import {
  blocoPremiumItem,
  DossieEvidenciasPremium,
} from "./DossieEvidenciasPremium";
import { ModalDossiePremium } from "./ModalDossiePremium";
import {
  dossiePremiumTemDetalhes,
  linhasResumoDossiePremium,
} from "./premium-dossie-resumo";

export type ConsultasRiscoPremiumSectionProps = {
  creditosPremium: number;
  riscosCarregados: RiscosCarregadosMap;
  blindagemAtiva: boolean;
  dadosLeilaoJson?: unknown;
  /** Aviso: mock/placa teste — fluxo PIX simulado; débito pode ser ignorado no sandbox. */
  sandboxPremiumAviso?: boolean;
};

export function ConsultasRiscoPremiumSection({
  creditosPremium,
  riscosCarregados,
  blindagemAtiva,
  dadosLeilaoJson,
  sandboxPremiumAviso = false,
}: ConsultasRiscoPremiumSectionProps) {
  const [dossieModal, setDossieModal] = useState<{
    tipo: TipoConsultaRiscoPremium;
    titulo: string;
  } | null>(null);

  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="card-consultas-risco-premium">
      {sandboxPremiumAviso ? (
        <p
          className="rounded-lg border border-violet-300/80 bg-violet-50/95 px-3 py-2 text-center text-xs font-semibold leading-snug text-violet-950"
          role="status"
          data-testid="aviso-riscos-sandbox-premium"
        >
          <span className="whitespace-nowrap">Modo sandbox / demonstração:</span> use{" "}
          <strong>Ativar Blindagem Completa</strong> normalmente. A resposta é{" "}
          <strong>simulada</strong> após &quot;Já paguei&quot;, sem API paga nem débito real de
          crédito.
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
        Um crédito libera as cinco verificações (incluindo Renainf) para{" "}
        <strong>esta placa</strong> de forma permanente (cache). Indícios positivos reduzem a
        referência de mercado na análise; multas reduzem o limite sugerido (“não pague mais que”).
      </p>
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/90 p-5 shadow-md ring-1 ring-slate-100 sm:p-6">
        {blindagemAtiva ? (
          <div
            className="mb-4 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-center"
            data-testid="titulo-dossie-validado"
          >
            <p className="text-sm font-black uppercase tracking-wide text-emerald-950">
              Dossiê de evidências validado
            </p>
            <p className="mt-1 text-xs text-emerald-900/90">
              Consultas registradas para esta placa — detalhes por tipo abaixo.
            </p>
          </div>
        ) : null}
        <h4 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
          {blindagemAtiva ? "Evidências por verificação" : "Análises premium por tipo"}
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {blindagemAtiva
            ? "Resumo das cinco verificações (Leilão, Sinistro, Roubo/furto, Gravame e Renainf) para esta placa."
            : "A blindagem completa consome 1 crédito e roda as cinco verificações de uma vez. Use o botão de destaque acima (Validar histórico) para iniciar."}
        </p>

        <ul className="mt-6 flex flex-col gap-6">
          {BLINDAGEM_TIPOS_UI.map(({ tipo, titulo }) => {
            const feito = riscosCarregados[tipo];
            const itemPremium = blocoPremiumItem(dadosLeilaoJson, tipo);
            const linhasResumo = feito
              ? linhasResumoDossiePremium(tipo, itemPremium)
              : [];
            const podeVerDossie =
              Boolean(feito?.constatado) &&
              blindagemAtiva &&
              dossiePremiumTemDetalhes(tipo, itemPremium);
            const ocultarEvidenciasInline = Boolean(
              feito?.constatado && podeVerDossie
            );

            return (
              <li
                key={tipo}
                className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm"
                data-testid={`card-blindagem-tipo-${tipo}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{titulo}</p>
                  {feito && blindagemAtiva ? (
                    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                      Consultado
                    </span>
                  ) : null}
                </div>
                {feito ? (
                  <>
                    <p className="mt-2 text-xs font-medium leading-snug text-slate-700">
                      {feito.constatado ? "⚠️ Indício positivo" : "✓ Sem ocorrência"} —{" "}
                      {feito.resumo}
                    </p>
                    {feito.constatado && linhasResumo.length > 0 ? (
                      <ul className="mt-2 space-y-1 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
                        {linhasResumo.map((l, idx) => (
                          <li key={idx}>{l}</li>
                        ))}
                      </ul>
                    ) : null}
                    {podeVerDossie ? (
                      <button
                        type="button"
                        className="mt-2 text-xs font-bold text-indigo-600 underline-offset-2 hover:text-indigo-800 hover:underline"
                        data-testid={`btn-ver-dossie-${tipo}`}
                        onClick={() => setDossieModal({ tipo, titulo })}
                      >
                        Abrir dossiê completo
                      </button>
                    ) : null}
                    {blindagemAtiva && !ocultarEvidenciasInline ? (
                      <DossieEvidenciasPremium
                        tipo={tipo}
                        itemPremium={itemPremium}
                      />
                    ) : null}
                  </>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    {blindagemAtiva
                      ? "—"
                      : "Incluído no pacote ao ativar a blindagem completa."}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <ModalDossiePremium
        aberto={dossieModal !== null}
        onFechar={() => setDossieModal(null)}
        tipo={dossieModal?.tipo ?? null}
        tituloTipo={dossieModal?.titulo ?? ""}
        dadosLeilaoJson={dadosLeilaoJson}
      />
    </div>
  );
}
