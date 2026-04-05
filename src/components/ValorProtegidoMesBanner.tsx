"use client";

import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { obterValorProtegidoMesAction } from "@/actions/metricas-valor-actions";
import { formatarMoedaBRL } from "@/lib/viabilidade";

type Props = {
  identificadorCliente: string;
  planoAtivo: boolean;
  /** Quando muda (ex.: após blindagem), recarrega a soma. */
  versaoAtualizacao?: number;
};

/**
 * KPI de retenção: soma `valor_evitar_perda` do mês (eventos `CREDITO_CONSUMIDO` no Supabase).
 */
export function ValorProtegidoMesBanner({
  identificadorCliente,
  planoAtivo,
  versaoAtualizacao = 0,
}: Props) {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!planoAtivo || !identificadorCliente.trim()) {
      setTotal(null);
      return;
    }
    let cancel = false;
    void (async () => {
      const { totalReais } = await obterValorProtegidoMesAction(
        identificadorCliente
      );
      if (!cancel) setTotal(totalReais);
    })();
    return () => {
      cancel = true;
    };
  }, [identificadorCliente, planoAtivo, versaoAtualizacao]);

  if (!planoAtivo || !identificadorCliente.trim()) return null;
  if (total === null) {
    return (
      <div
        className="mb-6 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-center text-xs text-slate-500"
        data-testid="valor-protegido-mes-loading"
      >
        Carregando resumo do mês…
      </div>
    );
  }
  if (total <= 0) return null;

  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/95 to-white px-4 py-3 shadow-sm ring-1 ring-emerald-100/80"
      data-testid="valor-protegido-mes-banner"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
        <TrendingUp className="size-5" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-900/90">
          Valor protegido este mês
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">
          Você já evitou{" "}
          <span className="font-mono text-base font-black tabular-nums text-emerald-950">
            {formatarMoedaBRL(total)}
          </span>{" "}
          em referência de mercado degradada por risco — com base nas blindagens
          registradas.
        </p>
      </div>
    </div>
  );
}
