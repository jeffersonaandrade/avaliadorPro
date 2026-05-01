import "server-only";

import {
  acumularResumoRoiCreditoPorLinhas,
  type ResumoRoiConfiabilidade,
} from "@/lib/reconciliacao-auditoria";
import { supabaseAdmin } from "@/lib/supabase";
import {
  colunasSandboxDbRow,
  FILTRO_AUDITORIA_APENAS_ORGANICO,
} from "@/lib/sandbox-integrity";

export type EventoAuditoriaConsultaNome =
  | "CONSULTA_INICIO"
  | "CONSULTA_SUCESSO"
  | "CONSULTA_ERRO"
  | "CONSULTA_TIMEOUT"
  | "CACHE_HIT"
  /** Chamada HTTP externa com custo ou impacto em cota (após resposta recebida). */
  | "API_CALL"
  | "CREDITO_CONSUMIDO"
  /** Consumo da cota mensal de consultas de placa (FIPE / persistência). */
  | "FIPE_CONSUMIDO"
  /** Consulta FIPE além da cota mensal (cobrança por uso; `valor_evitar_perda` = valor cobrado). */
  | "FIPE_EXCEDENTE_CONSUMIDO"
  /** Compra de créditos premium avulsos (billing futuro; hoje pode exigir env). */
  | "COMPRA_CREDITO"
  /** Crédito em saldo pré-pago FIPE (ex.: sandbox ou gateway futuro). */
  | "SALDO_PRE_PAGO_CREDITADO";

/**
 * Persistência opcional em `consultas_auditoria_eventos` (Supabase).
 * Falhas são ignoradas (tabela pode não existir ainda).
 */
export type LinhaConsultaAuditoriaEventoRow = {
  id: string;
  criado_em: string;
  cliente_id: string;
  placa: string;
  evento: string;
  tipo_consulta: string | null;
  detalhe: string | null;
  valor_evitar_perda: number | null;
  tipo_risco_detectado: string | null;
  request_id: string | null;
  persistencia_falhou_apos_debito?: boolean | null;
  blindagem_persistencia_falhou_apos_debito?: boolean | null;
};

export async function persistirEventoConsultaAuditoriaDb(input: {
  clienteId: string;
  placa: string;
  evento: EventoAuditoriaConsultaNome;
  tipoConsulta?: string | null;
  detalhe?: string | null;
  valorEvitarPerda?: number | null;
  tipoRiscoDetectado?: string | null;
  /** Correlaciona eventos da mesma operação (reconciliação). */
  requestId?: string | null;
  /**
   * Em `CREDITO_CONSUMIDO`: se true, o ROI entra como “suspeito” nas métricas (persistência após débito não confirmada).
   */
  persistenciaFalhouAposDebito?: boolean;
  blindagemPersistenciaFalhouAposDebito?: boolean;
}): Promise<void> {
  const cliente_id = (input.clienteId ?? "").trim();
  if (!cliente_id) return;

  const persistFalhou =
    input.persistenciaFalhouAposDebito === true ? true : false;
  const blindFalhou =
    input.blindagemPersistenciaFalhouAposDebito === true ? true : false;

  const sandboxCols = colunasSandboxDbRow();
  const baseRow = {
    cliente_id,
    placa: input.placa,
    evento: input.evento,
    tipo_consulta: input.tipoConsulta ?? null,
    detalhe: input.detalhe ?? null,
    valor_evitar_perda: input.valorEvitarPerda ?? null,
    tipo_risco_detectado: input.tipoRiscoDetectado ?? null,
    request_id: input.requestId?.trim() || null,
    ...sandboxCols,
  };

  /** Colunas extras exigem DDL em `database.sql`. */
  const row =
    input.evento === "CREDITO_CONSUMIDO"
      ? {
          ...baseRow,
          persistencia_falhou_apos_debito: persistFalhou,
          blindagem_persistencia_falhou_apos_debito: blindFalhou,
        }
      : baseRow;

  const { error } = await supabaseAdmin.from("consultas_auditoria_eventos").insert(row);

  if (error) {
    console.warn("[consulta_auditoria_db]", error.message);
  }
}

export function dispararPersistirEventoConsultaAuditoriaDb(
  input: Parameters<typeof persistirEventoConsultaAuditoriaDb>[0]
): void {
  void persistirEventoConsultaAuditoriaDb(input);
}

type LinhaCreditoMesDb = {
  valor_evitar_perda: unknown;
  detalhe: string | null;
  persistencia_falhou_apos_debito?: boolean | null;
  blindagem_persistencia_falhou_apos_debito?: boolean | null;
  is_sandbox?: boolean | null;
};

async function buscarLinhasCreditoConsumidoMesUtc(
  clienteId: string | undefined
): Promise<LinhaCreditoMesDb[]> {
  const now = new Date();
  const inicio = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  );

  let q = supabaseAdmin
    .from("consultas_auditoria_eventos")
    .select(
      "valor_evitar_perda, detalhe, persistencia_falhou_apos_debito, blindagem_persistencia_falhou_apos_debito, is_sandbox"
    )
    .eq("evento", "CREDITO_CONSUMIDO")
    .or(FILTRO_AUDITORIA_APENAS_ORGANICO)
    .gte("criado_em", inicio.toISOString());

  const id = (clienteId ?? "").trim();
  if (id) q = q.eq("cliente_id", id);

  const { data, error } = await q;

  if (error) {
    console.warn("[consulta_auditoria_db] credito_mes", error.message);
    return [];
  }

  return (data ?? []) as LinhaCreditoMesDb[];
}

/**
 * Soma `valor_evitar_perda` no mês civil UTC, só em `CREDITO_CONSUMIDO` com
 * persistência confirmada (ROI confiável — não inclui suspeitos).
 */
export async function obterSomaValorEvitarPerdaMesUtc(
  clienteId: string
): Promise<number> {
  const id = (clienteId ?? "").trim();
  if (!id) return 0;
  const resumo = acumularResumoRoiCreditoPorLinhas(
    await buscarLinhasCreditoConsumidoMesUtc(id)
  );
  return resumo.valor_total_protegido_valido;
}

/**
 * Agrega ROI confiável vs suspeito no mês civil UTC (`CREDITO_CONSUMIDO`).
 * Sem `clienteId`: todos os clientes (painel admin).
 */
export async function obterResumoRoiConfiabilidadeMesUtc(
  clienteId?: string
): Promise<ResumoRoiConfiabilidade> {
  const linhas = await buscarLinhasCreditoConsumidoMesUtc(clienteId);
  return acumularResumoRoiCreditoPorLinhas(linhas);
}
