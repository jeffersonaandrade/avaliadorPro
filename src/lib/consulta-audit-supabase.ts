import "server-only";

import { supabaseAdmin } from "@/lib/supabase";

export type EventoAuditoriaConsultaNome =
  | "CONSULTA_INICIO"
  | "CONSULTA_SUCESSO"
  | "CONSULTA_ERRO"
  | "CONSULTA_TIMEOUT"
  | "CACHE_HIT"
  | "CREDITO_CONSUMIDO";

/**
 * Persistência opcional em `consultas_auditoria_eventos` (Supabase).
 * Falhas são ignoradas (tabela pode não existir ainda).
 */
export async function persistirEventoConsultaAuditoriaDb(input: {
  clienteId: string;
  placa: string;
  evento: EventoAuditoriaConsultaNome;
  tipoConsulta?: string | null;
  detalhe?: string | null;
  valorEvitarPerda?: number | null;
  tipoRiscoDetectado?: string | null;
}): Promise<void> {
  const cliente_id = (input.clienteId ?? "").trim();
  if (!cliente_id) return;

  const { error } = await supabaseAdmin.from("consultas_auditoria_eventos").insert({
    cliente_id,
    placa: input.placa,
    evento: input.evento,
    tipo_consulta: input.tipoConsulta ?? null,
    detalhe: input.detalhe ?? null,
    valor_evitar_perda: input.valorEvitarPerda ?? null,
    tipo_risco_detectado: input.tipoRiscoDetectado ?? null,
  });

  if (error) {
    console.warn("[consulta_auditoria_db]", error.message);
  }
}

export function dispararPersistirEventoConsultaAuditoriaDb(
  input: Parameters<typeof persistirEventoConsultaAuditoriaDb>[0]
): void {
  void persistirEventoConsultaAuditoriaDb(input);
}

function numOuZero(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Soma `valor_evitar_perda` no mês civil UTC atual, só em `CREDITO_CONSUMIDO`
 * (evita contagem dupla com `CONSULTA_SUCESSO`).
 */
export async function obterSomaValorEvitarPerdaMesUtc(
  clienteId: string
): Promise<number> {
  const id = (clienteId ?? "").trim();
  if (!id) return 0;

  const now = new Date();
  const inicio = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  );

  const { data, error } = await supabaseAdmin
    .from("consultas_auditoria_eventos")
    .select("valor_evitar_perda")
    .eq("cliente_id", id)
    .eq("evento", "CREDITO_CONSUMIDO")
    .gte("criado_em", inicio.toISOString());

  if (error) {
    console.warn("[consulta_auditoria_db] soma_mes", error.message);
    return 0;
  }

  let sum = 0;
  for (const row of data ?? []) {
    sum += numOuZero(row.valor_evitar_perda);
  }
  return Math.round(sum * 100) / 100;
}
