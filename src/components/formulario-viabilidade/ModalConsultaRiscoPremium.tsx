"use client";

import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { consultarRiscoPremiumAction } from "@/actions/consultas-risco-actions";
import type { TipoConsultaRiscoPremium } from "@/lib/consultas-risco-premium";
import { CONSULTAS_RISCO_PREMIUM_UI, PIX_CHAVE_MOCK } from "./constants";

export type ModalConsultaRiscoPremiumProps = {
  placa: string;
  identificadorCliente: string;
  modal: { tipo: TipoConsultaRiscoPremium; precoLabel: string } | null;
  consultandoRiscoTipo: TipoConsultaRiscoPremium | null;
  erroConsultaRisco: string | null;
  onFechar: () => void;
  onErro: (msg: string | null) => void;
  onInicioConsulta: (tipo: TipoConsultaRiscoPremium) => void;
  onFimConsulta: () => void;
  onDadosLeilaoAtualizado?: (dadosLeilao: Record<string, unknown>) => void;
};

export function ModalConsultaRiscoPremium({
  placa,
  identificadorCliente,
  modal,
  consultandoRiscoTipo,
  erroConsultaRisco,
  onFechar,
  onErro,
  onInicioConsulta,
  onFimConsulta,
  onDadosLeilaoAtualizado,
}: ModalConsultaRiscoPremiumProps) {
  if (!modal || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[1px] sm:items-center"
      role="presentation"
      onClick={() => {
        if (!consultandoRiscoTipo) onFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-pix-consulta-risco-titulo"
        data-testid="modal-pix-consulta-risco"
        className="max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="modal-pix-consulta-risco-titulo"
          className="text-lg font-bold tracking-tight text-slate-900"
        >
          Análise:{" "}
          {CONSULTAS_RISCO_PREMIUM_UI.find((x) => x.tipo === modal.tipo)?.titulo ?? modal.tipo}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          Realize o pagamento via PIX. Em seguida confirmamos e chamamos a API desta consulta (simulação até integração
          real).
        </p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chave PIX</p>
          <p className="mt-1 font-mono text-base font-bold tabular-nums text-slate-900">{PIX_CHAVE_MOCK}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{modal.precoLabel}</p>
        </div>
        {erroConsultaRisco ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
            data-testid="erro-consulta-risco-premium"
          >
            {erroConsultaRisco}
          </p>
        ) : null}
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Após o pagamento, clique em &apos;Já paguei&apos; para registrar o resultado.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            data-testid="btn-copiar-chave-pix-consulta-risco"
            disabled={consultandoRiscoTipo !== null}
            onClick={() => {
              void navigator.clipboard?.writeText(PIX_CHAVE_MOCK);
            }}
          >
            Copiar chave PIX
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="btn-ja-paguei-consulta-risco"
            disabled={consultandoRiscoTipo !== null}
            onClick={() => {
              const ctx = modal;
              void (async () => {
                onErro(null);
                onInicioConsulta(ctx.tipo);
                try {
                          const res = await consultarRiscoPremiumAction(
                            placa,
                            ctx.tipo,
                            identificadorCliente
                          );
                  if (!res.sucesso) {
                    onErro(res.erro);
                    return;
                  }
                  onDadosLeilaoAtualizado?.(res.dadosLeilao);
                  onFechar();
                } catch {
                  onErro("Não foi possível concluir a consulta. Tente novamente.");
                } finally {
                  onFimConsulta();
                }
              })();
            }}
          >
            {consultandoRiscoTipo === modal.tipo ? (
              <>
                <Loader2
                  className="size-5 shrink-0 animate-spin text-white/95 [animation-duration:850ms]"
                  strokeWidth={2}
                  aria-hidden
                />
                Consultando…
              </>
            ) : (
              "Já paguei"
            )}
          </button>
        </div>
        <button
          type="button"
          className="mt-4 w-full text-center text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700 disabled:opacity-50"
          data-testid="btn-fechar-modal-consulta-risco"
          disabled={consultandoRiscoTipo !== null}
          onClick={onFechar}
        >
          Fechar
        </button>
      </div>
    </div>,
    document.body
  );
}
