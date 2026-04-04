import { MOCK_DEMO_USER_ID, isPublicDemoMocksMode } from "@/lib/demo-mocks";
import { supabaseAdmin } from "@/lib/supabase";

const TABELA = "usuario_acesso";

export type UsuarioAcessoRow = {
  identificador: string;
  plano_ativo: boolean;
  consultas_fipe_utilizadas: number;
  consultas_fipe_limite: number;
  fipe_mes_referencia: string;
  creditos_premium: number;
};

/** YYYY-MM UTC */
export function mesReferenciaUtcAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

function devAcessoTotalAtivo(): boolean {
  return (
    String(process.env.AVALIADOR_DEV_ACESSO_TOTAL ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}

/** Ambiente local: plano ativo, limites altos (não usar em produção). */
export function usuarioDevSynthetic(identificador: string): UsuarioAcessoRow {
  return {
    identificador: identificador.trim() || "dev",
    plano_ativo: true,
    consultas_fipe_utilizadas: 0,
    consultas_fipe_limite: 999_999,
    fipe_mes_referencia: mesReferenciaUtcAtual(),
    creditos_premium: 999_999,
  };
}

/** Modo demo público: alinhado a `mockUserAcesso` (Premium, 999 FIPE / 999 créditos). */
export function usuarioDemoAcessoRow(identificador: string): UsuarioAcessoRow {
  const id = identificador.trim() || MOCK_DEMO_USER_ID;
  return {
    identificador: id,
    plano_ativo: true,
    consultas_fipe_utilizadas: 0,
    consultas_fipe_limite: 999,
    fipe_mes_referencia: mesReferenciaUtcAtual(),
    creditos_premium: 999,
  };
}

export async function carregarUsuarioAcesso(
  identificador: string
): Promise<UsuarioAcessoRow | null> {
  const id = identificador.trim();
  if (devAcessoTotalAtivo()) return usuarioDevSynthetic(id || "dev");
  if (isPublicDemoMocksMode()) return usuarioDemoAcessoRow(id);
  if (!id) return null;

  const { data, error } = await supabaseAdmin
    .from(TABELA)
    .select(
      "identificador, plano_ativo, consultas_fipe_utilizadas, consultas_fipe_limite, fipe_mes_referencia, creditos_premium"
    )
    .eq("identificador", id)
    .maybeSingle();

  if (error) {
    console.error("[usuario_acesso] leitura", error);
    return null;
  }
  if (!data) return null;

  return {
    identificador: data.identificador,
    plano_ativo: Boolean(data.plano_ativo),
    consultas_fipe_utilizadas: Number(data.consultas_fipe_utilizadas) || 0,
    consultas_fipe_limite: Math.max(
      0,
      Number(data.consultas_fipe_limite) || 0
    ),
    fipe_mes_referencia: String(data.fipe_mes_referencia ?? ""),
    creditos_premium: Math.max(0, Number(data.creditos_premium) || 0),
  };
}

/**
 * Garante que o contador mensal de FIPE corresponde ao mês UTC atual.
 * Se mudou o mês, zera `consultas_fipe_utilizadas` no banco.
 */
export async function normalizarMesContadorFipe(
  u: UsuarioAcessoRow
): Promise<UsuarioAcessoRow> {
  if (devAcessoTotalAtivo()) return u;
  if (isPublicDemoMocksMode()) return u;
  const mes = mesReferenciaUtcAtual();
  if (u.fipe_mes_referencia === mes) return u;

  const { error } = await supabaseAdmin
    .from(TABELA)
    .update({
      consultas_fipe_utilizadas: 0,
      fipe_mes_referencia: mes,
    })
    .eq("identificador", u.identificador);

  if (error) {
    console.error("[usuario_acesso] reset mês FIPE", error);
    return { ...u, fipe_mes_referencia: mes, consultas_fipe_utilizadas: 0 };
  }
  return {
    ...u,
    fipe_mes_referencia: mes,
    consultas_fipe_utilizadas: 0,
  };
}

export function podeUsarConsultaFipe(u: UsuarioAcessoRow): boolean {
  if (!u.plano_ativo) return false;
  if (u.consultas_fipe_limite <= 0) return false;
  return u.consultas_fipe_utilizadas < u.consultas_fipe_limite;
}

export const MSG_LIMITE_FIPE_PLANO =
  "Você atingiu o limite de consultas do seu plano";

export const MSG_SEM_PLANO =
  "Acesso exclusivo para assinantes Avaliador PRO. Assine um plano para analisar veículos.";

export const MSG_SEM_CREDITOS_PREMIUM =
  "Você não possui créditos suficientes";

/** Incrementa após `resolverPrecoFipe` retornar match válido. */
export async function incrementarConsultaFipeSucesso(
  identificador: string
): Promise<void> {
  const id = identificador.trim();
  if (!id || devAcessoTotalAtivo() || isPublicDemoMocksMode()) return;

  const u = await carregarUsuarioAcesso(id);
  if (!u) return;
  const n = await normalizarMesContadorFipe(u);

  const { error } = await supabaseAdmin
    .from(TABELA)
    .update({
      consultas_fipe_utilizadas: n.consultas_fipe_utilizadas + 1,
      atualizado_em: new Date().toISOString(),
    })
    .eq("identificador", id);

  if (error) console.error("[usuario_acesso] incrementar FIPE", error);
}

/**
 * Debita 1 crédito premium com verificação otimista de concorrência.
 * Retorna false se não houver saldo.
 */
export async function debitarCreditoPremium(
  identificador: string
): Promise<boolean> {
  const id = identificador.trim();
  if (!id || devAcessoTotalAtivo() || isPublicDemoMocksMode()) return true;

  const u = await carregarUsuarioAcesso(id);
  if (!u || u.creditos_premium < 1) return false;
  const atual = u.creditos_premium;

  const { data, error } = await supabaseAdmin
    .from(TABELA)
    .update({
      creditos_premium: atual - 1,
      atualizado_em: new Date().toISOString(),
    })
    .eq("identificador", id)
    .eq("creditos_premium", atual)
    .select("creditos_premium")
    .maybeSingle();

  if (error) {
    console.error("[usuario_acesso] debitar crédito", error);
    return false;
  }
  return data !== null;
}
