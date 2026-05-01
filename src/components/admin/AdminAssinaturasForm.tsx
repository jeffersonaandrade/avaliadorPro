"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import {
  adminAlterarPlanoManualAction,
  adminAtivarAssinaturaManualAction,
  adminAtivarPlanoAction,
  adminCancelarAssinaturaAction,
} from "@/actions/admin-assinaturas-actions";

const PLANOS = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "PRO" },
  { value: "premium", label: "Premium" },
] as const;

export function AdminAssinaturasForm() {
  const [clienteId, setClienteId] = useState("");
  const [plano, setPlano] = useState<string>("pro");
  const [adminSecret, setAdminSecret] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    fn: () => Promise<{ ok: boolean; erro?: string; idempotente?: boolean }>
  ) {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        const idem =
          "idempotente" in r && r.idempotente === true
            ? " (idempotente — datas mantidas)"
            : "";
        setMsg(`OK${idem}`);
      } else {
        setMsg(r.erro ?? "Falha.");
      }
    });
  }

  return (
    <div className="max-w-xl space-y-6 rounded-2xl border border-slate-700/80 bg-slate-900/50 p-6 ring-1 ring-white/5">
      <div className="space-y-2">
        <label
          htmlFor="admin-cliente-id"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Cliente (identificador / user id)
        </label>
        <input
          id="admin-cliente-id"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value.trim())}
          placeholder="UUID do Supabase Auth"
          className="w-full rounded-xl border border-slate-600 bg-slate-950/80 px-4 py-3 font-mono text-sm text-slate-100 outline-none focus:border-cyan-500/60"
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="admin-plano"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Plano
        </label>
        <select
          id="admin-plano"
          value={plano}
          onChange={(e) => setPlano(e.target.value)}
          className="w-full rounded-xl border border-slate-600 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500/60"
        >
          {PLANOS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="admin-secret"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Secret admin (se <code className="text-cyan-400">AVALIADOR_ADMIN_SECRET</code> estiver
          definido)
        </label>
        <input
          id="admin-secret"
          type="password"
          value={adminSecret}
          onChange={(e) => setAdminSecret(e.target.value)}
          placeholder="Opcional em desenvolvimento sem secret"
          className="w-full rounded-xl border border-slate-600 bg-slate-950/80 px-4 py-3 font-mono text-sm text-slate-100 outline-none focus:border-cyan-500/60"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={isPending || !clienteId}
          onClick={() =>
            run(() => adminAtivarPlanoAction(clienteId, plano, adminSecret))
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          Ativar plano (+30 dias)
        </button>
        <button
          type="button"
          disabled={isPending || !clienteId}
          onClick={() =>
            run(() =>
              adminAlterarPlanoManualAction(clienteId, plano, adminSecret)
            )
          }
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-500/50 bg-amber-950/30 px-4 text-sm font-bold text-amber-100 transition hover:bg-amber-900/40 disabled:opacity-50"
        >
          Trocar plano (mantém expiração)
        </button>
        <button
          type="button"
          disabled={isPending || !clienteId}
          onClick={() =>
            run(() =>
              adminAtivarAssinaturaManualAction(clienteId, plano, adminSecret)
            )
          }
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/25 px-4 text-sm font-bold text-cyan-100 transition hover:bg-cyan-900/35 disabled:opacity-50"
        >
          Reativar assinatura (+30 dias)
        </button>
        <button
          type="button"
          disabled={isPending || !clienteId}
          onClick={() =>
            run(() => adminCancelarAssinaturaAction(clienteId, adminSecret))
          }
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-500/50 bg-rose-950/30 px-4 text-sm font-bold text-rose-100 transition hover:bg-rose-900/40 disabled:opacity-50"
        >
          Cancelar assinatura ativa
        </button>
      </div>

      {msg ? (
        <p
          role="status"
          className="rounded-lg border border-slate-600 bg-slate-950/60 px-4 py-3 text-sm text-slate-200"
        >
          {msg}
        </p>
      ) : null}

      <p className="text-[11px] leading-relaxed text-slate-500">
        Downgrade: a cota FIPE inclusa é limitada ao novo teto (ex.: 40 usadas → 30 no PRO).
        Segundo clique em &quot;Ativar plano&quot; com o mesmo plano ainda válido não soma +30
        dias (idempotente).
      </p>
    </div>
  );
}
