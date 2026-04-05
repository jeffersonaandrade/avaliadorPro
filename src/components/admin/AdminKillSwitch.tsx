"use client";

import { useState } from "react";

import {
  alternarKillSwitchPremiumDemoAction,
  type EstadoKillSwitchPremium,
} from "@/actions/admin-actions";

type Props = { initial: EstadoKillSwitchPremium };

export function AdminKillSwitch({ initial }: Props) {
  const [ativo, setAtivo] = useState(initial.efetivo);
  const [envForcado] = useState(initial.envForcado);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar() {
    setErro(null);
    setPending(true);
    const r = await alternarKillSwitchPremiumDemoAction();
    setPending(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setAtivo(r.efetivo);
  }

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-5 ring-1 ring-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">Kill switch (APIs premium)</h3>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Simulação em memória: bloqueia{" "}
            <code className="rounded bg-slate-800 px-1 text-cyan-200/90">
              consultarRiscoPremiumAction
            </code>{" "}
            e{" "}
            <code className="rounded bg-slate-800 px-1 text-cyan-200/90">
              ativarBlindagemCompletaAction
            </code>{" "}
            quando ativo. Variável{" "}
            <code className="text-slate-400">PREMIUM_API_KILL_SWITCH=true</code>{" "}
            tem prioridade.
          </p>
          {envForcado ? (
            <p className="mt-2 text-xs font-medium text-amber-300">
              Ambiente força kill switch ligado — o toggle local não desliga.
            </p>
          ) : null}
          {erro ? (
            <p className="mt-2 text-xs text-rose-300" role="alert">
              {erro}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void alternar()}
          disabled={pending || envForcado}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50 ${
            ativo
              ? "bg-rose-600 text-white hover:bg-rose-500"
              : "bg-emerald-700 text-white hover:bg-emerald-600"
          }`}
          data-testid="btn-kill-switch-premium"
        >
          {pending ? "…" : ativo ? "Desativar (demo)" : "Ativar kill switch"}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-slate-600">
        Estado efetivo:{" "}
        <span className={ativo ? "text-rose-300" : "text-emerald-300"}>
          {ativo ? "BLOQUEADO" : "liberado"}
        </span>
      </p>
    </div>
  );
}
