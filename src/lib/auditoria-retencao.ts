import "server-only";

import {
  parseResultadoRetencaoRpc,
  type ResultadoRetencaoAuditoria,
} from "@/lib/auditoria-retencao-logic";
import { supabaseAdmin } from "@/lib/supabase";

export type { ResultadoRetencaoAuditoria };
export {
  detectarSilentPurgeNaAgregacao,
  parseResultadoRetencaoRpc,
} from "@/lib/auditoria-retencao-logic";

/**
 * Executa retenção em **uma transação no Postgres** (função `auditoria_retencao_executar`):
 * agregação idempotente → validação → DELETEs só após sucesso.
 */
export async function executarRetencaoAuditoriaFinanceira(): Promise<ResultadoRetencaoAuditoria> {
  const { data, error } = await supabaseAdmin.rpc("auditoria_retencao_executar");

  if (error) {
    console.error(
      "[auditoria_retencao] Falha na agregação ou na função SQL. DELETE não aplicado (rollback).",
      error.message
    );
    throw new Error(error.message);
  }

  try {
    return parseResultadoRetencaoRpc(data);
  } catch (e) {
    console.error("[auditoria_retencao] Validação da resposta RPC falhou.", e);
    throw e;
  }
}
