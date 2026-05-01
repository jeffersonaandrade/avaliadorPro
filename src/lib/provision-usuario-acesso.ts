import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { mesReferenciaUtcAtual } from "@/lib/usuario-acesso";
import {
  limitesPlanoPorSlug,
  PLANOS_LANDING,
} from "@/lib/planos-marketing";

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
      plano: slug,
      consultas_fipe_limite: consultasFipeLimite,
      consultas_fipe_utilizadas: 0,
      fipe_mes_referencia: mes,
      creditos_premium: creditosPremium,
      consultas_excedentes: 0,
      valor_total_excedente: 0,
      saldo_pre_pago: 0,
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

/**
 * Define ou atualiza o plano do usuário (limites do bundle).
 * - **Insert:** zera `consultas_fipe_utilizadas`, define créditos iniciais do plano.
 * - **Update:** ajusta `plano`, `consultas_fipe_limite` e `plano_ativo`; **não** altera
 *   `creditos_premium` nem o contador (evita apagar créditos avulsos já comprados).
 */
export async function definirPlanoUsuario(
  identificador: string,
  planoRaw: string | null | undefined
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const id = identificador.trim();
  if (!id) return { ok: false, erro: "identificador inválido." };

  const slug = normalizarSlugPlanoAuth(planoRaw);
  const { consultasFipeLimite, creditosPremium } = limitesPlanoPorSlug(slug);
  const mes = mesReferenciaUtcAtual();
  const agora = new Date().toISOString();

  const { data: existente, error: leituraErr } = await supabaseAdmin
    .from(TABELA)
    .select("identificador")
    .eq("identificador", id)
    .maybeSingle();

  if (leituraErr) {
    console.error("[definirPlanoUsuario] leitura", leituraErr);
    return { ok: false, erro: leituraErr.message };
  }

  if (!existente) {
    const { error } = await supabaseAdmin.from(TABELA).insert({
      identificador: id,
      plano_ativo: true,
      plano: slug,
      consultas_fipe_limite: consultasFipeLimite,
      consultas_fipe_utilizadas: 0,
      fipe_mes_referencia: mes,
      creditos_premium: creditosPremium,
      consultas_excedentes: 0,
      valor_total_excedente: 0,
      saldo_pre_pago: 0,
      atualizado_em: agora,
    });
    if (error) {
      console.error("[definirPlanoUsuario] insert", error);
      return { ok: false, erro: error.message };
    }
    return { ok: true };
  }

  const { error } = await supabaseAdmin
    .from(TABELA)
    .update({
      plano_ativo: true,
      plano: slug,
      consultas_fipe_limite: consultasFipeLimite,
      atualizado_em: agora,
    })
    .eq("identificador", id);

  if (error) {
    console.error("[definirPlanoUsuario] update", error);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}
