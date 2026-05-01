"use server";

import { envNextPublicUseMocksAtivo } from "@/lib/demo-mocks";
import { dispararPersistirEventoConsultaAuditoriaDb } from "@/lib/consulta-audit-supabase";
import { limitesPlanoPorSlug, PRECO_CREDITO_PREMIUM_AVULSO_REAIS } from "@/lib/planos-marketing";
import { normalizarSlugPlanoAuth } from "@/lib/provision-usuario-acesso";
import {
  carregarUsuarioAcesso,
  mesReferenciaUtcAtual,
} from "@/lib/usuario-acesso";
import { supabaseAdmin } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const TABELA = "usuario_acesso";

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function gateSandboxMocks():
  | { ok: true }
  | { ok: false; erro: string } {
  if (!envNextPublicUseMocksAtivo()) {
    return {
      ok: false,
      erro:
        "Ações de teste financeiro só existem com NEXT_PUBLIC_USE_MOCKS=true.",
    };
  }
  return { ok: true };
}

export type TesteFinanceiroOk<T> =
  | { ok: true; data: T }
  | { ok: false; erro: string };

/**
 * Sandbox: incrementa `creditos_premium` e audita `COMPRA_CREDITO` sem gateway.
 * Só com `NEXT_PUBLIC_USE_MOCKS=true`.
 */
export async function mockSimularCompraCredito(
  quantidade: number
): Promise<TesteFinanceiroOk<{ creditosPremium: number }>> {
  const g = gateSandboxMocks();
  if (!g.ok) return { ok: false, erro: g.erro };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user?.id) {
    return { ok: false, erro: "Faça login para simular compra." };
  }

  const id = user.id.trim();
  const q = Math.floor(Number(quantidade));
  if (!Number.isFinite(q) || q < 1 || q > 50) {
    return { ok: false, erro: "Quantidade inválida (1 a 50)." };
  }

  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `mock-compra-${Date.now()}`;

  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const bruto = await carregarUsuarioAcesso(id);
    if (!bruto?.plano_ativo) {
      return {
        ok: false,
        erro: "Plano inativo. Ative um plano no sandbox antes de simular compra.",
      };
    }
    const atual = bruto.creditos_premium;

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
      console.error("[mockSimularCompraCredito]", error);
      return { ok: false, erro: "Não foi possível simular a compra." };
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
          origem: "mock_sandbox",
        }),
        requestId,
      });
      return { ok: true, data: { creditosPremium: novo } };
    }
  }

  return {
    ok: false,
    erro: "Concorrência ao atualizar saldo. Tente novamente.",
  };
}

/**
 * Sandbox: credita saldo pré-pago FIPE (sem gateway). Só com `NEXT_PUBLIC_USE_MOCKS=true`.
 */
export async function mockAdicionarSaldo(
  valor: number
): Promise<TesteFinanceiroOk<{ saldoPrePago: number }>> {
  const g = gateSandboxMocks();
  if (!g.ok) return { ok: false, erro: g.erro };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user?.id) {
    return { ok: false, erro: "Faça login para adicionar saldo de teste." };
  }

  const id = user.id.trim();
  const v = roundMoney2(Number(valor));
  if (!Number.isFinite(v) || v < 0.01 || v > 10_000) {
    return { ok: false, erro: "Valor inválido (R$ 0,01 a R$ 10.000,00)." };
  }

  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `mock-saldo-${Date.now()}`;

  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const bruto = await carregarUsuarioAcesso(id);
    if (!bruto?.plano_ativo) {
      return {
        ok: false,
        erro: "Plano inativo. Ative um plano no sandbox antes de adicionar saldo.",
      };
    }
    const atual = roundMoney2(bruto.saldo_pre_pago);
    const novo = roundMoney2(atual + v);

    const { data, error } = await supabaseAdmin
      .from(TABELA)
      .update({
        saldo_pre_pago: novo,
        atualizado_em: new Date().toISOString(),
      })
      .eq("identificador", id)
      .eq("saldo_pre_pago", atual)
      .select("saldo_pre_pago")
      .maybeSingle();

    if (error) {
      console.error("[mockAdicionarSaldo]", error);
      return { ok: false, erro: "Não foi possível creditar o saldo." };
    }
    if (data) {
      const saldoPrePago = roundMoney2(Number(data.saldo_pre_pago) || 0);
      dispararPersistirEventoConsultaAuditoriaDb({
        clienteId: id,
        placa: "—",
        evento: "SALDO_PRE_PAGO_CREDITADO",
        tipoConsulta: "saldo_fipe_pre_pago",
        detalhe: JSON.stringify({
          valor_creditado: v,
          saldo_apos: saldoPrePago,
          origem: "mock_sandbox",
        }),
        requestId,
      });
      return { ok: true, data: { saldoPrePago } };
    }
  }

  return {
    ok: false,
    erro: "Concorrência ao atualizar saldo. Tente novamente.",
  };
}

/**
 * Sandbox: zera consumo FIPE do mês, restaura limites e créditos do bundle do plano,
 * limpa excedentes. Não chama gateway.
 */
export async function mockResetarConta(): Promise<
  TesteFinanceiroOk<{
    consultasFipeLimite: number;
    creditosPremium: number;
    fipeMesReferencia: string;
  }>
> {
  const g = gateSandboxMocks();
  if (!g.ok) return { ok: false, erro: g.erro };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user?.id) {
    return { ok: false, erro: "Faça login para resetar a conta de teste." };
  }

  const id = user.id.trim();
  const bruto = await carregarUsuarioAcesso(id);
  if (!bruto) {
    return { ok: false, erro: "Perfil não encontrado." };
  }

  const slug = normalizarSlugPlanoAuth(bruto.plano);
  const { consultasFipeLimite, creditosPremium } = limitesPlanoPorSlug(slug);
  const mes = mesReferenciaUtcAtual();

  const { error } = await supabaseAdmin
    .from(TABELA)
    .update({
      consultas_fipe_utilizadas: 0,
      consultas_fipe_limite: consultasFipeLimite,
      fipe_mes_referencia: mes,
      creditos_premium: creditosPremium,
      consultas_excedentes: 0,
      valor_total_excedente: 0,
      saldo_pre_pago: 0,
      atualizado_em: new Date().toISOString(),
    })
    .eq("identificador", id);

  if (error) {
    console.error("[mockResetarConta]", error);
    return { ok: false, erro: "Não foi possível resetar a conta de teste." };
  }

  return {
    ok: true,
    data: {
      consultasFipeLimite,
      creditosPremium,
      fipeMesReferencia: mes,
    },
  };
}
