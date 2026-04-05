"use client";

import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { ativarBlindagemCompletaAction } from "@/actions/consultas-risco-actions";
import { PIX_CHAVE_MOCK } from "./constants";

export type ModalConsultaRiscoPremiumProps = {
  aberto: boolean;
  placa: string;
  identificadorCliente: string;
  consultando: boolean;
  erroConsultaRisco: string | null;
  onFechar: () => void;
  onErro: (msg: string | null) => void;
  onInicioConsulta: () => void;
  onFimConsulta: () => void;
  onDadosLeilaoAtualizado?: (dadosLeilao: Record<string, unknown>) => void;
};

export function ModalConsultaRiscoPremium({
  aberto,
  placa,
  identificadorCliente,
  consultando,
  erroConsultaRisco,
  onFechar,
  onErro,
  onInicioConsulta,
  onFimConsulta,
  onDadosLeilaoAtualizado,
}: ModalConsultaRiscoPremiumProps) {
  if (!aberto || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[1px] sm:items-center"
      role="presentation"
      onClick={() => {
        if (!consultando) onFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-blindagem-titulo"
        data-testid="modal-pix-blindagem-completa"
        className="max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="modal-blindagem-titulo"
          className="text-lg font-bold tracking-tight text-slate-900"
        >
          Blindagem completa de risco
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          Um único passo verifica <strong>Leilão</strong>, <strong>Sinistro</strong>,{" "}
          <strong>Roubo/furto</strong>, <strong>Gravame</strong> e{" "}
          <strong>infrações (Renainf)</strong> para esta placa. Consome{" "}
          <strong>1 crédito</strong> no seu plano (simulação PIX até o gateway real).
        </p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Chave PIX
          </p>
          <p className="mt-1 font-mono text-base font-bold tabular-nums text-slate-900">
            {PIX_CHAVE_MOCK}
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Valor
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">1 crédito premium</p>
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
          Após o pagamento, clique em &quot;Já paguei&quot; para registrar as cinco análises
          nesta placa.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            data-testid="btn-copiar-chave-pix-consulta-risco"
            disabled={consultando}
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
            disabled={consultando}
            onClick={() => {
              void (async () => {
                onErro(null);
                onInicioConsulta();
                try {
                  const res = await ativarBlindagemCompletaAction(
                    placa,
                    identificadorCliente
                  );
                  if (!res.sucesso) {
                    onErro(res.erro);
                    return;
                  }
                  onDadosLeilaoAtualizado?.(res.dadosLeilao);
                  onFechar();
                } catch {
                  onErro("Não foi possível concluir a blindagem. Tente novamente.");
                } finally {
                  onFimConsulta();
                }
              })();
            }}
          >
            {consultando ? (
              <>
                <Loader2
                  className="size-5 shrink-0 animate-spin text-white/95 [animation-duration:850ms]"
                  strokeWidth={2}
                  aria-hidden
                />
                Validando histórico…
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
          disabled={consultando}
          onClick={onFechar}
        >
          Fechar
        </button>
      </div>
    </div>,
    document.body
  );
}
