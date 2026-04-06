import Link from "next/link";

import { obterResumoRoiConfiabilidadeAction } from "@/actions/metricas-valor-actions";
import {
  buscarTimelineReconciliacaoAdmin,
  obterDashboardReconciliacaoAdmin,
  obterSaudaveisComFalhaPersistenciaAdmin,
} from "@/actions/reconciliacao-actions";
import {
  mockLinhasTimelineReconciliacao,
  mockReconciliacaoDashboard,
} from "@/lib/admin-mocks";
import { isPublicDemoMocksMode } from "@/lib/demo-mocks";
import {
  eventosOrdenadosCronologico,
  rotuloClassificacaoGrupo,
  type LinhaEventoAuditoriaDb,
} from "@/lib/reconciliacao-auditoria";
import { formatarMoedaBRL } from "@/lib/viabilidade";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reconciliação financeira",
  description: "Conciliação de auditoria de consultas premium e créditos.",
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
    second: "2-digit",
  });
}

function corEvento(evento: string): string {
  switch (evento) {
    case "CONSULTA_SUCESSO":
      return "text-emerald-300";
    case "CREDITO_CONSUMIDO":
      return "text-amber-200";
    case "CONSULTA_ERRO":
    case "CONSULTA_TIMEOUT":
      return "text-rose-300";
    case "CONSULTA_INICIO":
      return "text-cyan-300";
    case "CACHE_HIT":
      return "text-slate-400";
    default:
      return "text-slate-200";
  }
}

function TimelineLista({ linhas }: { linhas: LinhaEventoAuditoriaDb[] }) {
  if (!linhas.length) {
    return (
      <p className="text-sm text-slate-500">
        Nenhum evento. Informe placa, cliente ou request_id e busque.
      </p>
    );
  }
  return (
    <ol className="space-y-2 font-mono text-xs">
      {linhas.map((e) => (
        <li
          key={e.id}
          className="flex flex-wrap items-baseline gap-x-2 border-b border-slate-800/80 py-2 last:border-0"
        >
          <span className="tabular-nums text-slate-500">
            [{formatarDataHoraBr(e.criado_em)}]
          </span>
          <span className={`font-semibold ${corEvento(e.evento)}`}>
            {e.evento}
          </span>
          {e.tipo_consulta ? (
            <span className="text-slate-400">tipo={e.tipo_consulta}</span>
          ) : null}
          {e.request_id ? (
            <span className="max-w-[200px] truncate text-slate-500">
              rid={e.request_id}
            </span>
          ) : null}
          {e.detalhe ? (
            <span className="max-w-full text-slate-500">{e.detalhe}</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

type SearchProps = {
  searchParams: Promise<{
    placa?: string;
    cliente_id?: string;
    request_id?: string;
  }>;
};

export default async function AdminReconciliacaoPage({
  searchParams,
}: SearchProps) {
  const sp = await searchParams;
  const placaQ = (sp.placa ?? "").trim();
  const clienteIdQ = (sp.cliente_id ?? "").trim();
  const requestIdQ = (sp.request_id ?? "").trim();

  const demo = isPublicDemoMocksMode();
  const dash = demo
    ? mockReconciliacaoDashboard()
    : await obterDashboardReconciliacaoAdmin(30, 7);

  const roiMes = await obterResumoRoiConfiabilidadeAction();

  const saudaveisPersist = demo
    ? []
    : await obterSaudaveisComFalhaPersistenciaAdmin(7, 25);

  let timelineLinhas: LinhaEventoAuditoriaDb[] = [];
  let timelineErro: string | null = null;
  if (placaQ || clienteIdQ || requestIdQ) {
    if (demo) {
      const filtradas = mockLinhasTimelineReconciliacao.filter((e) => {
        if (requestIdQ && e.request_id !== requestIdQ) return false;
        if (placaQ && e.placa !== placaQ.toUpperCase()) return false;
        if (clienteIdQ && e.cliente_id !== clienteIdQ) return false;
        return true;
      });
      timelineLinhas = eventosOrdenadosCronologico(filtradas);
    } else {
      const t = await buscarTimelineReconciliacaoAdmin({
        placa: placaQ,
        clienteId: clienteIdQ,
        requestId: requestIdQ,
      });
      timelineLinhas = t.linhas;
      timelineErro = t.erro;
    }
  }

  const { kpis } = dash;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0c1428] to-slate-950 text-slate-100">
      <div className="border-b border-cyan-950/40 bg-slate-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
              Reconciliação financeira
            </h1>
            {demo ? (
              <span className="inline-flex items-center rounded-full border border-amber-500/50 bg-amber-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-200">
                Demo
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-medium">
            <Link
              href="/admin"
              className="text-cyan-300/90 transition hover:text-cyan-200"
            >
              ← Centro de comando
            </Link>
            <Link
              href="/painel"
              className="text-slate-400 transition hover:text-slate-200"
            >
              Painel
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
        <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
          Trindade da conciliação:{" "}
          <strong className="font-medium text-slate-300">CONSULTA_SUCESSO</strong>{" "}
          (entregue),{" "}
          <strong className="font-medium text-slate-300">
            CREDITO_CONSUMIDO
          </strong>{" "}
          (débito registrado),{" "}
          <strong className="font-medium text-slate-300">
            CONSULTA_ERRO + TIMEOUT
          </strong>{" "}
          (falhas). Somente leitura da tabela{" "}
          <code className="rounded bg-slate-800/80 px-1 text-cyan-200/90">
            consultas_auditoria_eventos
          </code>
          .
        </p>

        {dash.erroLeitura ? (
          <div
            className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-100"
            role="alert"
          >
            Aviso ao ler o Supabase: {dash.erroLeitura}
          </div>
        ) : null}

        {kpis.alertaDebitoMaiorQueSucesso ? (
          <div
            className="rounded-xl border border-rose-600/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-50 shadow-lg shadow-rose-950/30"
            role="alert"
          >
            <p className="font-bold">Possível inconsistência</p>
            <p className="mt-1 text-rose-100/90">
              Créditos consumidos ({kpis.dDebito}) maior que consultas entregues
              ({kpis.cSucesso}). Investigue divergência entre débito e trilha de
              sucesso.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-2 text-xs text-emerald-200/90">
            Indicador: débitos auditados ≤ sucessos no período (regra D ≤ C).
          </div>
        )}

        <section aria-label="KPIs de conciliação">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">
            Dashboard — últimos {dash.diasJanela} dias
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-5 ring-1 ring-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Taxa de sucesso
              </p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums text-emerald-300">
                {kpis.taxaSucessoPct}%
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                C / (C + E) — sem cache na taxa
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-900/40 bg-cyan-950/20 p-5 ring-1 ring-cyan-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
                C — CONSULTA_SUCESSO
              </p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums text-white">
                {kpis.cSucesso}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-5 ring-1 ring-amber-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">
                D — CREDITO_CONSUMIDO
              </p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums text-amber-100">
                {kpis.dDebito}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-5 ring-1 ring-rose-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-300/80">
                E — erros + timeouts
              </p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums text-rose-100">
                {kpis.eFalha}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                CACHE_HIT no período: {kpis.cacheHit}
              </p>
            </div>
          </div>
        </section>

        <section aria-label="ROI confiabilidade mês UTC">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">
            Valor protegido — mês civil UTC atual
          </h2>
          {roiMes.valor_total_protegido_suspeito > 0 ? (
            <div
              className="mb-4 rounded-xl border border-amber-600/50 bg-amber-950/35 px-4 py-3 text-sm text-amber-50 shadow-lg shadow-amber-950/20"
              role="alert"
            >
              Parte do ROI está em verificação devido a inconsistências técnicas.
              Não utilizar este valor para relatórios comerciais.
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/25 p-5 ring-1 ring-emerald-500/15">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/90">
                Valor protegido (confirmado)
              </p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-emerald-100">
                {formatarMoedaBRL(roiMes.valor_total_protegido_valido)}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Baseado em operações com persistência confirmada.{" "}
                <span className="tabular-nums text-slate-400">
                  {roiMes.total_consultas_validas} consulta(s) válida(s)
                </span>
              </p>
            </div>
            <div className="rounded-2xl border border-rose-800/50 bg-rose-950/30 p-5 ring-1 ring-rose-500/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-300/90">
                Valor protegido (em verificação)
              </p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-rose-100">
                {formatarMoedaBRL(roiMes.valor_total_protegido_suspeito)}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Operações com inconsistência de persistência.{" "}
                <span className="tabular-nums text-slate-400">
                  {roiMes.total_consultas_suspeitas} consulta(s)
                </span>
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Busca timeline">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">
            Timeline de transação
          </h2>
          <form
            method="get"
            className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-700/80 bg-slate-900/40 p-4"
          >
            <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-slate-400">
              Placa
              <input
                name="placa"
                defaultValue={placaQ}
                placeholder="ABC1D23"
                className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600"
              />
            </label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-slate-400">
              cliente_id
              <input
                name="cliente_id"
                defaultValue={clienteIdQ}
                placeholder="uuid ou id"
                className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600"
              />
            </label>
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-slate-400">
              request_id
              <input
                name="request_id"
                defaultValue={requestIdQ}
                placeholder="UUID da operação"
                className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
            >
              Buscar
            </button>
          </form>
          {timelineErro ? (
            <p className="text-sm text-rose-400">{timelineErro}</p>
          ) : null}
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/40 p-4 ring-1 ring-white/5">
            <TimelineLista linhas={timelineLinhas} />
          </div>
        </section>

        <section aria-label="Inconsistências">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">
            Detecção automática
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-slate-200">
                Grupos críticos (abandonados ou crédito sem sucesso)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Agrupamento por request_id ou placa+cliente+bucket ~60s. Início
                sem fechamento após 60s = abandonada.
              </p>
              <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto text-xs">
                {dash.gruposCriticos.length === 0 ? (
                  <li className="text-slate-500">Nenhum no recorte atual.</li>
                ) : (
                  dash.gruposCriticos.map((g) => (
                    <li
                      key={g.chave}
                      className="rounded-lg border border-slate-700/60 bg-slate-950/50 p-3"
                    >
                      <p className="font-medium text-amber-200/90">
                        {rotuloClassificacaoGrupo(g.classificacao)}
                      </p>
                      <p className="mt-1 text-slate-400">
                        {g.placa} · {g.cliente_id}
                        {g.requestId ? ` · rid ${g.requestId}` : ""}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {g.eventos.length} evento(s)
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-slate-200">
                ⚠️ Possível falha de persistência
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Grupos &quot;saudáveis&quot; (sucesso + crédito) onde{" "}
                <code className="text-cyan-300/90">consultas_veiculos</code> não
                reflete o esperado.
              </p>
              <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto text-xs">
                {!saudaveisPersist.length ? (
                  <li className="text-slate-500">
                    Nenhuma divergência nos grupos analisados.
                  </li>
                ) : (
                  saudaveisPersist.map(({ grupo, motivo }) => (
                    <li
                      key={grupo.chave}
                      className="rounded-lg border border-rose-800/40 bg-rose-950/20 p-3 text-rose-100/95"
                    >
                      <p className="font-mono text-[11px] text-slate-400">
                        {grupo.placa} · {grupo.cliente_id}
                      </p>
                      <p className="mt-1">{motivo}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>

        <section aria-label="Amostra persistência crédito">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">
            Amostra — últimos créditos vs. cache
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/40 ring-1 ring-white/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700/90 bg-slate-950/50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Quando</th>
                    <th className="px-4 py-3">Placa</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Persistência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/90">
                  {dash.amostrasPersistencia.map((a) => (
                    <tr key={a.eventoId} className="hover:bg-slate-800/20">
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-400">
                        {formatarDataHoraBr(a.criado_em)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-cyan-200/90">
                        {a.placa}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-slate-300">
                        {a.cliente_id}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {a.tipo_consulta ?? "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-xs ${
                          a.persistenciaOk ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {a.motivoPersistencia}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section aria-label="Por cliente">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">
            Visão financeira por cliente
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/40 ring-1 ring-white/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700/90 bg-slate-950/50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">cliente_id</th>
                    <th className="px-4 py-3 text-right">Créditos (D)</th>
                    <th className="px-4 py-3 text-right">Sucessos (C)</th>
                    <th className="px-4 py-3 text-right">Falhas (E)</th>
                    <th className="px-4 py-3 text-right">
                      Σ valor_evitar_perda
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/90">
                  {dash.agregadoClientes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Sem eventos no período.
                      </td>
                    </tr>
                  ) : (
                    dash.agregadoClientes.map((row) => (
                      <tr key={row.cliente_id} className="hover:bg-slate-800/20">
                        <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-slate-200">
                          {row.cliente_id}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-200/90">
                          {row.creditosConsumidos}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-200/90">
                          {row.consultasSucesso}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-rose-200/80">
                          {row.falhas}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                          {formatarMoedaBRL(row.somaValorEvitarPerda)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Coluna Σ: soma de{" "}
            <code className="text-slate-500">valor_evitar_perda</code> apenas em
            eventos CREDITO_CONSUMIDO (base para métricas futuras de ROI).
          </p>
        </section>
      </div>
    </main>
  );
}
