"use server";

import { supabaseAdmin } from "@/lib/supabase";
import {
  agregarPorCliente,
  agruparEventosEmTransacoes,
  calcularKpisConciliacao,
  eventosOrdenadosCronologico,
  type DashboardReconciliacao,
  type GrupoTransacao,
  type LinhaEventoAuditoriaDb,
  type LinhaPersistenciaReconciliacao,
  ultimoEventoCreditoNoGrupo,
} from "@/lib/reconciliacao-auditoria";
import { verificarPersistenciaAposCredito } from "@/lib/reconciliacao-persistencia";

const EVENTOS_KPI = [
  "CONSULTA_SUCESSO",
  "CREDITO_CONSUMIDO",
  "CONSULTA_ERRO",
  "CONSULTA_TIMEOUT",
  "CONSULTA_INICIO",
  "CACHE_HIT",
] as const;

const MAX_LINHAS_AGREGACAO = 20_000;
const MAX_LINHAS_GRUPOS = 12_000;
const MAX_TIMELINE = 500;
const AMOSTRA_PERSISTENCIA = 18;

function desdeNDiasIso(dias: number): string {
  return new Date(Date.now() - dias * 86_400_000).toISOString();
}

function mapRow(
  r: Record<string, unknown>
): LinhaEventoAuditoriaDb | null {
  const id = typeof r.id === "string" ? r.id : "";
  const criado_em = typeof r.criado_em === "string" ? r.criado_em : "";
  const cliente_id = typeof r.cliente_id === "string" ? r.cliente_id : "";
  const placa = typeof r.placa === "string" ? r.placa : "";
  const evento = typeof r.evento === "string" ? r.evento : "";
  if (!id || !criado_em || !cliente_id || !placa || !evento) return null;
  return {
    id,
    criado_em,
    cliente_id,
    placa,
    evento,
    tipo_consulta:
      typeof r.tipo_consulta === "string" ? r.tipo_consulta : null,
    detalhe: typeof r.detalhe === "string" ? r.detalhe : null,
    valor_evitar_perda:
      typeof r.valor_evitar_perda === "number" ? r.valor_evitar_perda : null,
    tipo_risco_detectado:
      typeof r.tipo_risco_detectado === "string"
        ? r.tipo_risco_detectado
        : null,
    request_id: typeof r.request_id === "string" ? r.request_id : null,
    persistencia_falhou_apos_debito:
      typeof r.persistencia_falhou_apos_debito === "boolean"
        ? r.persistencia_falhou_apos_debito
        : null,
    blindagem_persistencia_falhou_apos_debito:
      typeof r.blindagem_persistencia_falhou_apos_debito === "boolean"
        ? r.blindagem_persistencia_falhou_apos_debito
        : null,
  };
}

async function contarPorEvento(
  evento: string,
  desdeIso: string
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("consultas_auditoria_eventos")
    .select("id", { count: "exact", head: true })
    .eq("evento", evento)
    .gte("criado_em", desdeIso);
  if (error) {
    console.warn("[reconciliacao] contarPorEvento", evento, error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * KPIs, agregado por cliente, grupos problemáticos e amostra de checagem de persistência.
 */
export async function obterDashboardReconciliacaoAdmin(
  diasJanelaKpi = 30,
  diasJanelaGrupos = 7
): Promise<DashboardReconciliacao> {
  const desdeKpi = desdeNDiasIso(diasJanelaKpi);
  const desdeGrupos = desdeNDiasIso(diasJanelaGrupos);
  let erroLeitura: string | null = null;

  const contagens: Record<string, number> = {};
  try {
    await Promise.all(
      EVENTOS_KPI.map(async (ev) => {
        contagens[ev] = await contarPorEvento(ev, desdeKpi);
      })
    );
  } catch (e) {
    erroLeitura = e instanceof Error ? e.message : String(e);
  }

  const kpis = calcularKpisConciliacao(contagens);

  const { data: rowsAgg, error: errAgg } = await supabaseAdmin
    .from("consultas_auditoria_eventos")
    .select(
      "id, criado_em, cliente_id, placa, evento, tipo_consulta, detalhe, valor_evitar_perda, tipo_risco_detectado, request_id, persistencia_falhou_apos_debito, blindagem_persistencia_falhou_apos_debito"
    )
    .gte("criado_em", desdeKpi)
    .order("criado_em", { ascending: false })
    .limit(MAX_LINHAS_AGREGACAO);

  if (errAgg) {
    console.warn("[reconciliacao] agregação", errAgg.message);
    erroLeitura = erroLeitura ?? errAgg.message;
  }

  const linhasAgg: LinhaEventoAuditoriaDb[] = [];
  for (const r of rowsAgg ?? []) {
    const m = mapRow(r as Record<string, unknown>);
    if (m) linhasAgg.push(m);
  }
  const agregadoClientes = agregarPorCliente(linhasAgg);

  const { data: rowsGrupos, error: errGr } = await supabaseAdmin
    .from("consultas_auditoria_eventos")
    .select(
      "id, criado_em, cliente_id, placa, evento, tipo_consulta, detalhe, valor_evitar_perda, tipo_risco_detectado, request_id, persistencia_falhou_apos_debito, blindagem_persistencia_falhou_apos_debito"
    )
    .gte("criado_em", desdeGrupos)
    .order("criado_em", { ascending: true })
    .limit(MAX_LINHAS_GRUPOS);

  if (errGr) {
    console.warn("[reconciliacao] grupos", errGr.message);
    erroLeitura = erroLeitura ?? errGr.message;
  }

  const linhasGr: LinhaEventoAuditoriaDb[] = [];
  for (const r of rowsGrupos ?? []) {
    const m = mapRow(r as Record<string, unknown>);
    if (m) linhasGr.push(m);
  }

  const grupos = agruparEventosEmTransacoes(linhasGr);
  const gruposCriticos = grupos.filter(
    (g) =>
      g.classificacao === "abandonada" ||
      g.classificacao === "inconsistente_credito_sem_sucesso"
  );

  const { data: rowsCred, error: errCr } = await supabaseAdmin
    .from("consultas_auditoria_eventos")
    .select(
      "id, criado_em, cliente_id, placa, evento, tipo_consulta, detalhe, valor_evitar_perda, tipo_risco_detectado, request_id, persistencia_falhou_apos_debito, blindagem_persistencia_falhou_apos_debito"
    )
    .eq("evento", "CREDITO_CONSUMIDO")
    .gte("criado_em", desdeKpi)
    .order("criado_em", { ascending: false })
    .limit(AMOSTRA_PERSISTENCIA);

  const amostrasPersistencia: LinhaPersistenciaReconciliacao[] = [];
  if (errCr) {
    console.warn("[reconciliacao] amostra crédito", errCr.message);
  } else {
    for (const r of rowsCred ?? []) {
      const m = mapRow(r as Record<string, unknown>);
      if (!m) continue;
      const v = await verificarPersistenciaAposCredito(m.placa, {
        detalhe: m.detalhe,
        tipo_consulta: m.tipo_consulta,
        criado_em: m.criado_em,
      });
      amostrasPersistencia.push({
        eventoId: m.id,
        placa: m.placa,
        cliente_id: m.cliente_id,
        criado_em: m.criado_em,
        tipo_consulta: m.tipo_consulta,
        detalhe: m.detalhe,
        persistenciaOk: v.ok,
        motivoPersistencia: v.motivo,
      });
    }
  }

  return {
    desdeIso: desdeKpi,
    diasJanela: diasJanelaKpi,
    kpis,
    agregadoClientes,
    gruposCriticos: gruposCriticos.slice(0, 80),
    amostrasPersistencia,
    erroLeitura,
  };
}

export type TimelineReconciliacao = {
  linhas: LinhaEventoAuditoriaDb[];
  erro: string | null;
};

/**
 * Eventos em ordem cronológica (placa, cliente_id ou request_id).
 */
export async function buscarTimelineReconciliacaoAdmin(input: {
  placa?: string;
  clienteId?: string;
  requestId?: string;
}): Promise<TimelineReconciliacao> {
  const placaNorm = (input.placa ?? "").trim().toUpperCase();
  const clienteId = (input.clienteId ?? "").trim();
  const requestId = (input.requestId ?? "").trim();
  if (!placaNorm && !clienteId && !requestId) {
    return { linhas: [], erro: null };
  }

  let q = supabaseAdmin
    .from("consultas_auditoria_eventos")
    .select(
      "id, criado_em, cliente_id, placa, evento, tipo_consulta, detalhe, valor_evitar_perda, tipo_risco_detectado, request_id, persistencia_falhou_apos_debito, blindagem_persistencia_falhou_apos_debito"
    )
    .order("criado_em", { ascending: true })
    .limit(MAX_TIMELINE);

  if (requestId) {
    q = q.eq("request_id", requestId);
  } else {
    if (placaNorm) q = q.eq("placa", placaNorm);
    if (clienteId) q = q.eq("cliente_id", clienteId);
  }

  const { data, error } = await q;
  if (error) {
    return { linhas: [], erro: error.message };
  }
  const linhas: LinhaEventoAuditoriaDb[] = [];
  for (const r of data ?? []) {
    const m = mapRow(r as Record<string, unknown>);
    if (m) linhas.push(m);
  }
  return { linhas: eventosOrdenadosCronologico(linhas), erro: null };
}

/**
 * Grupos classificados como saudáveis cuja checagem em `consultas_veiculos` falhou.
 */
export async function obterSaudaveisComFalhaPersistenciaAdmin(
  diasJanela = 7,
  limite = 40
): Promise<
  Array<{
    grupo: GrupoTransacao;
    motivo: string;
  }>
> {
  const desde = desdeNDiasIso(diasJanela);
  const { data, error } = await supabaseAdmin
    .from("consultas_auditoria_eventos")
    .select(
      "id, criado_em, cliente_id, placa, evento, tipo_consulta, detalhe, valor_evitar_perda, tipo_risco_detectado, request_id, persistencia_falhou_apos_debito, blindagem_persistencia_falhou_apos_debito"
    )
    .gte("criado_em", desde)
    .order("criado_em", { ascending: true })
    .limit(MAX_LINHAS_GRUPOS);

  if (error) {
    console.warn("[reconciliacao] saudaveis persist", error.message);
    return [];
  }

  const linhas: LinhaEventoAuditoriaDb[] = [];
  for (const r of data ?? []) {
    const m = mapRow(r as Record<string, unknown>);
    if (m) linhas.push(m);
  }

  const out: Array<{ grupo: GrupoTransacao; motivo: string }> = [];
  for (const g of agruparEventosEmTransacoes(linhas)) {
    if (g.classificacao !== "saudavel") continue;
    const cred = ultimoEventoCreditoNoGrupo(g);
    if (!cred) continue;
    const v = await verificarPersistenciaAposCredito(g.placa, {
      detalhe: cred.detalhe,
      tipo_consulta: cred.tipo_consulta,
      criado_em: cred.criado_em,
    });
    if (!v.ok) {
      out.push({ grupo: g, motivo: v.motivo });
      if (out.length >= limite) break;
    }
  }
  return out;
}
