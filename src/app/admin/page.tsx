import Link from "next/link";

import { obterEstadoKillSwitchPremiumAction } from "@/actions/admin-actions";
import { AdminKillSwitch } from "@/components/admin/AdminKillSwitch";
import {
  computarKpisResumoAuditoria,
  obterUltimasAuditoriasConsulta,
  type LinhaAuditoriaConsulta,
  type StatusDebitoAuditoria,
} from "@/lib/consulta-audit-log";
import {
  mockAlertasUsoSuspeito,
  mockAuditoriaConsultas10,
  mockKpisAdmin,
} from "@/lib/admin-mocks";
import { isPublicDemoMocksMode } from "@/lib/demo-mocks";
import { formatarMoedaBRL } from "@/lib/viabilidade";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Centro de Comando",
  description: "Auditoria, KPIs e antifraude.",
};

function formatarDataHoraBr(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function labelStatusDebito(s: StatusDebitoAuditoria): string {
  switch (s) {
    case "debitado_ok":
      return "Débito OK";
    case "debito_falhou":
      return "Débito falhou";
    case "nao_aplicavel_cache":
      return "Cache (sem débito)";
    case "nao_aplicavel_mock":
      return "Mock / sem débito";
    default:
      return s;
  }
}

type LinhaTabela = {
  id: string;
  usuarioLabel: string;
  placa: string;
  custoRealReais: number;
  statusDebito: StatusDebitoAuditoria;
  quandoIso: string;
};

export default async function AdminPage() {
  const estadoKillSwitch = await obterEstadoKillSwitchPremiumAction();
  const demo = isPublicDemoMocksMode();
  const kpiLive = computarKpisResumoAuditoria();
  const ultimasLive = obterUltimasAuditoriasConsulta(10);

  const k = demo ? mockKpisAdmin : null;
  const kpis = k
    ? {
        faturamento: k.faturamentoBrutoReais,
        custoApi: k.custoTotalApiReais,
        lucro: k.lucroLiquidoReais,
        volume: k.volumeConsultas,
        custoUnit: k.custoPorConsultaPremiumReais,
      }
    : {
        faturamento: kpiLive.faturamentoBrutoReais,
        custoApi: kpiLive.custoTotalApiReais,
        lucro: kpiLive.lucroLiquidoReais,
        volume: kpiLive.volumeConsultas,
        custoUnit: 16,
      };

  const linhasTabela: LinhaTabela[] = demo
    ? mockAuditoriaConsultas10.map((r) => ({
        id: r.id,
        usuarioLabel: r.usuario,
        placa: r.placa,
        custoRealReais: r.custoRealReais,
        statusDebito: r.statusDebito,
        quandoIso: r.dataHoraIso,
      }))
    : ultimasLive.map((r: LinhaAuditoriaConsulta) => ({
        id: r.id,
        usuarioLabel: r.usuarioId,
        placa: r.placa,
        custoRealReais: r.custoRealReais,
        statusDebito: r.statusDebito,
        quandoIso: r.quandoIso,
      }));

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0c1428] to-slate-950 text-slate-100">
      <div className="border-b border-cyan-950/40 bg-slate-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
              Avaliador PRO — Centro de Comando
            </h1>
            {demo ? (
              <span
                className="inline-flex items-center rounded-full border border-amber-500/50 bg-amber-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-200"
                data-testid="badge-admin-demo"
              >
                Modo demo ativo
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-slate-600/60 bg-slate-800/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Auditoria ao vivo (buffer)
              </span>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-4">
            <Link
              href="/admin/reconciliacao"
              className="text-xs font-medium text-amber-200/90 transition hover:text-amber-100"
            >
              Reconciliação financeira
            </Link>
            <Link
              href="/painel"
              className="text-xs font-medium text-cyan-300/90 transition hover:text-cyan-200"
            >
              ← Voltar ao painel
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-slate-400">
          KPIs financeiros, auditoria de consultas e kill switch para APIs premium.
          {!demo
            ? " Resumo derivado do buffer em memória da instância (sem banco dedicado)."
            : null}
        </p>

        {demo ? (
          <section
            className="mb-8 space-y-3"
            aria-label="Alertas de uso suspeito (demonstração)"
          >
            {mockAlertasUsoSuspeito.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  a.severidade === "alta"
                    ? "border-rose-500/40 bg-rose-950/25 text-rose-100"
                    : "border-amber-500/35 bg-amber-950/20 text-amber-100"
                }`}
              >
                <p className="font-bold">{a.titulo}</p>
                <p className="mt-1 text-xs opacity-90">{a.descricao}</p>
              </div>
            ))}
          </section>
        ) : null}

        <div className="mb-10">
          <AdminKillSwitch initial={estadoKillSwitch} />
        </div>

        <section aria-label="Métricas principais">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-5 shadow-lg shadow-black/20 ring-1 ring-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Faturamento bruto
              </p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-white">
                {formatarMoedaBRL(kpis.faturamento)}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-5 shadow-lg shadow-black/20 ring-1 ring-rose-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-300/80">
                Custo total API
              </p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-rose-100">
                {formatarMoedaBRL(kpis.custoApi)}
              </p>
              <p className="mt-1 text-[10px] text-rose-200/60">
                ~{formatarMoedaBRL(kpis.custoUnit)} / consulta premium
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/25 p-5 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-400/15">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/90">
                Lucro líquido
              </p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-emerald-300 sm:text-3xl">
                {formatarMoedaBRL(kpis.lucro)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-5 shadow-lg shadow-black/20 ring-1 ring-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Volume de consultas
              </p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-cyan-200">
                {kpis.volume}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10" aria-label="Auditoria recente">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">
            Auditoria — últimas 10 consultas
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/40 shadow-xl shadow-black/25 ring-1 ring-white/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700/90 bg-slate-950/50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 sm:px-5">Data / hora</th>
                    <th className="px-4 py-3 sm:px-5">Usuário</th>
                    <th className="px-4 py-3 sm:px-5">Placa</th>
                    <th className="px-4 py-3 text-right sm:px-5">Custo real</th>
                    <th className="px-4 py-3 sm:px-5">Status débito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/90">
                  {linhasTabela.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-500 sm:px-5"
                      >
                        Nenhum evento no buffer ainda. Execute consultas no
                        painel para popular a auditoria.
                      </td>
                    </tr>
                  ) : (
                    linhasTabela.map((row) => (
                      <tr
                        key={row.id}
                        className="transition hover:bg-slate-800/30"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-slate-300 sm:px-5">
                          {formatarDataHoraBr(row.quandoIso)}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3.5 font-medium text-slate-200 sm:max-w-xs sm:px-5">
                          {row.usuarioLabel}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-cyan-200/90 sm:px-5">
                          {row.placa}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-slate-200 sm:px-5">
                          {formatarMoedaBRL(row.custoRealReais)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-300 sm:px-5">
                          {labelStatusDebito(row.statusDebito)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-slate-600">
          Rate limit, anti-enumeração e kill switch aplicam-se a consultas premium
          reais (fora do modo demo público).
        </p>
      </div>
    </main>
  );
}
