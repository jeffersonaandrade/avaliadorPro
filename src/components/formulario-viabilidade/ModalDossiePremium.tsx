"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import {
  DossieEvidenciasPremium,
  blocoPremiumItem,
} from "./DossieEvidenciasPremium";
import { linhasResumoDossiePremium } from "./premium-dossie-resumo";
import type { TipoConsultaRiscoPremium } from "@/lib/consultas-risco-premium";

export type ModalDossiePremiumProps = {
  aberto: boolean;
  onFechar: () => void;
  tipo: TipoConsultaRiscoPremium | null;
  tituloTipo: string;
  dadosLeilaoJson: unknown;
};

export function ModalDossiePremium({
  aberto,
  onFechar,
  tipo,
  tituloTipo,
  dadosLeilaoJson,
}: ModalDossiePremiumProps) {
  useEffect(() => {
    if (!aberto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [aberto, onFechar]);

  if (!aberto || !tipo) return null;

  const item = blocoPremiumItem(dadosLeilaoJson, tipo);
  const linhas = linhasResumoDossiePremium(tipo, item);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-dossie-titulo"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Fechar"
        onClick={onFechar}
      />
      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="modal-dossie-titulo"
              className="text-base font-bold text-slate-900"
            >
              Dossiê — {tituloTipo}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Dados retornados pela consulta premium.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        {linhas.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-800">
            {linhas.map((l, i) => (
              <li key={i} className="leading-snug">
                {l}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            Não há campos detalhados estruturados neste retorno; veja o resumo na
            lista principal.
          </p>
        )}

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Evidências na íntegra
          </p>
          <div className="mt-2">
            <DossieEvidenciasPremium tipo={tipo} itemPremium={item} />
          </div>
        </div>
      </div>
    </div>
  );
}
