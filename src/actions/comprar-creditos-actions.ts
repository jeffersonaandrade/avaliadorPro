"use server";

import { PRECO_CREDITO_PREMIUM_AVULSO_REAIS } from "@/lib/planos-marketing";
import { dispararPersistirEventoConsultaAuditoriaDb } from "@/lib/consulta-audit-supabase";
import {
  carregarUsuarioAcesso,
  normalizarMesContadorFipe,
} from "@/lib/usuario-acesso";
import { supabaseAdmin } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const TABELA = "usuario_acesso";

function compraDiretaHabilitadaNoServidor(): boolean {
  return (
    String(process.env.AVALIADOR_PERMITIR_COMPRA_CREDITO_DIRETA ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}

export type ComprarCreditosPremiumResult =
  | { ok: true; creditosPremium: number }
  | { ok: false; erro: string };

/**
 * Incrementa `creditos_premium` e registra `COMPRA_CREDITO` na auditoria.
 * **Produção:** sem pagamento integrado, só roda se
 * `AVALIADOR_PERMITIR_COMPRA_CREDITO_DIRETA=true` (ex.: staging). Com Stripe/PIX,
 * o webhook deve chamar lógica equivalente no servidor.
 */
export async function comprarCreditosPremiumAction(
  identificadorCliente: string,
  quantidade: number
): Promise<ComprarCreditosPremiumResult> {
  if (!compraDiretaHabilitadaNoServidor()) {
    return {
      ok: false,
      erro:
        "Compra de créditos ainda não está disponível neste ambiente. Use a página de planos ou fale com o suporte.",
    };
  }

  const id = (identificadorCliente ?? "").trim();
  if (!id) {
    return { ok: false, erro: "Sessão inválida." };
  }

  const q = Math.floor(Number(quantidade));
  if (!Number.isFinite(q) || q < 1 || q > 50) {
    return { ok: false, erro: "Quantidade inválida (1 a 50)." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user?.id) {
    return { ok: false, erro: "Faça login para comprar créditos." };
  }
  if (user.id.trim() !== id) {
    return { ok: false, erro: "Sessão não corresponde ao identificador." };
  }

  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `compra-${Date.now()}`;

  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const bruto = await carregarUsuarioAcesso(id);
    if (!bruto?.plano_ativo) {
      return { ok: false, erro: "Plano inativo. Assine um plano para comprar créditos." };
    }
    const u = await normalizarMesContadorFipe(bruto);
    const atual = u.creditos_premium;

    const { data, error } = await supabaseAdmin
      .from(TABELA)
      .update({
        creditos_premium: atual + q,
        atualizado_em: new Date().toISOString(),
      })
      .eq("identificador", id)
      .eq("creditos_premium", atual)
      .select("creditos_premium")
      .maybeSingle();

    if (error) {
      console.error("[comprarCreditosPremium]", error);
      return { ok: false, erro: "Não foi possível concluir a compra. Tente novamente." };
    }
    if (data) {
      const novo = Math.max(0, Number(data.creditos_premium) || 0);
      dispararPersistirEventoConsultaAuditoriaDb({
        clienteId: id,
        placa: "—",
        evento: "COMPRA_CREDITO",
        tipoConsulta: "credito_premium_avulso",
        detalhe: JSON.stringify({
          quantidade: q,
          preco_unitario_reais: PRECO_CREDITO_PREMIUM_AVULSO_REAIS,
          creditos_apos: novo,
        }),
        requestId,
      });
      return { ok: true, creditosPremium: novo };
    }
  }

  return {
    ok: false,
    erro: "Concorrência alta ao atualizar saldo. Tente novamente em instantes.",
  };
}
