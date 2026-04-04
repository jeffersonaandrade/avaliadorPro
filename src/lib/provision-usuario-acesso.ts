import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { mesReferenciaUtcAtual } from "@/lib/usuario-acesso";
import { PLANOS_LANDING } from "@/lib/planos-marketing";

const TABELA = "usuario_acesso";

/** Normaliza slug de plano (URL / OAuth). */
export function normalizarSlugPlanoAuth(
  raw: string | null | undefined
): (typeof PLANOS_LANDING)[number]["slug"] {
  const s = (raw ?? "").toLowerCase().trim();
  if (s === "pro") return "pro";
  if (s === "premium") return "premium";
  if (s === "basico" || s === "starter" || s === "") return "starter";
  const found = PLANOS_LANDING.find((p) => p.slug === s);
  return found ? found.slug : "starter";
}

export function limitesPlanoPorSlug(
  slug: (typeof PLANOS_LANDING)[number]["slug"]
): { consultasFipeLimite: number; creditosPremium: number } {
  const p = PLANOS_LANDING.find((x) => x.slug === slug);
  if (!p) return { consultasFipeLimite: 20, creditosPremium: 0 };
  return {
    consultasFipeLimite: p.fipeMes,
    creditosPremium: p.creditosRisco,
  };
}

type ProvisionOpts = {
  /** Se true, não sobrescreve linha existente (ex.: retorno OAuth). */
  apenasSeNaoExistir?: boolean;
};

/**
 * Cria ou atualiza `usuario_acesso` com `identificador = user.id` do Auth.
 * Usa service_role (ignora RLS).
 */
export async function provisionUsuarioAcessoPorAuthUserId(
  authUserId: string,
  planoRaw: string | null | undefined,
  opts?: ProvisionOpts
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const id = authUserId.trim();
  if (!id) return { ok: false, erro: "user_id inválido." };

  const slug = normalizarSlugPlanoAuth(planoRaw);
  const { consultasFipeLimite, creditosPremium } = limitesPlanoPorSlug(slug);
  const mes = mesReferenciaUtcAtual();

  if (opts?.apenasSeNaoExistir) {
    const { data: existente } = await supabaseAdmin
      .from(TABELA)
      .select("identificador")
      .eq("identificador", id)
      .maybeSingle();
    if (existente) return { ok: true };
  }

  const { error } = await supabaseAdmin.from(TABELA).upsert(
    {
      identificador: id,
      plano_ativo: true,
      consultas_fipe_limite: consultasFipeLimite,
      consultas_fipe_utilizadas: 0,
      fipe_mes_referencia: mes,
      creditos_premium: creditosPremium,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "identificador" }
  );

  if (error) {
    console.error("[provision-usuario-acesso]", error);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}
