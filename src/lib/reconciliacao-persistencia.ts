import "server-only";

import {
  blindagemCompletaJaAtiva,
  consultaPremiumTipoFrescaNoBloco,
  TIPOS_CONSULTA_RISCO_PREMIUM,
  type TipoConsultaRiscoPremium,
} from "@/lib/consultas-risco-premium";
import { supabaseAdmin } from "@/lib/supabase";

import type { LinhaEventoAuditoriaDb } from "@/lib/reconciliacao-auditoria";

function isTipoPremium(s: string | null): s is TipoConsultaRiscoPremium {
  return (
    !!s &&
    (TIPOS_CONSULTA_RISCO_PREMIUM as readonly string[]).includes(s)
  );
}

/**
 * Verifica se `consultas_veiculos.dados_leilao` reflete o esperado após um
 * `CREDITO_CONSUMIDO` (somente leitura — suporte à reconciliação).
 */
export async function verificarPersistenciaAposCredito(
  placa: string,
  evento: Pick<
    LinhaEventoAuditoriaDb,
    "detalhe" | "tipo_consulta" | "criado_em"
  >
): Promise<{ ok: boolean; motivo: string }> {
  const placaNorm = (placa ?? "").trim().toUpperCase();
  if (!placaNorm) {
    return { ok: false, motivo: "Placa vazia" };
  }

  const { data, error } = await supabaseAdmin
    .from("consultas_veiculos")
    .select("dados_leilao")
    .eq("placa", placaNorm)
    .maybeSingle();

  if (error) {
    return { ok: false, motivo: `Erro ao ler cache: ${error.message}` };
  }
  if (!data) {
    return {
      ok: false,
      motivo: "Linha inexistente em consultas_veiculos para esta placa",
    };
  }

  const root = (data.dados_leilao ?? {}) as Record<string, unknown>;
  const det = (evento.detalhe ?? "").toLowerCase();

  if (det.includes("blindagem_completa")) {
    const ok = blindagemCompletaJaAtiva(root);
    return ok
      ? { ok: true, motivo: "Blindagem completa refletida no JSON" }
      : {
          ok: false,
          motivo:
            "⚠️ POSSÍVEL FALHA DE PERSISTÊNCIA — blindagem debitada mas pacote premium incompleto ou expirado no cache",
        };
  }

  const tipo = evento.tipo_consulta;
  if (isTipoPremium(tipo)) {
    const block = root.consultas_premium;
    const b =
      block && typeof block === "object" && !Array.isArray(block)
        ? (block as Record<string, unknown>)
        : {};
    const ok = consultaPremiumTipoFrescaNoBloco(b, tipo);
    return ok
      ? { ok: true, motivo: `Tipo ${tipo} presente e dentro do TTL` }
      : {
          ok: false,
          motivo: `⚠️ POSSÍVEL FALHA DE PERSISTÊNCIA — crédito registrado mas tipo ${tipo} ausente ou fora do TTL em dados_leilao`,
        };
  }

  return { ok: true, motivo: "Sem critério específico de premium no evento" };
}
