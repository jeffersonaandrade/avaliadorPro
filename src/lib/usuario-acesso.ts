import {
  acessoLegacySemAssinatura,
  obterAssinaturaVigente,
} from "@/lib/assinaturas";
import { MOCK_DEMO_USER_ID, isPublicDemoMocksMode } from "@/lib/demo-mocks";
import { dispararPersistirEventoConsultaAuditoriaDb } from "@/lib/consulta-audit-supabase";
import { podeConsumirFipe } from "@/lib/fipe-cota-calculo";
import { calcularPrecoExcedente } from "@/lib/planos-marketing";
import { supabaseAdmin } from "@/lib/supabase";

const TABELA = "usuario_acesso";

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseValorExcedenteDb(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return roundMoney2(n);
}

export type UsuarioAcessoRow = {
  identificador: string;
  plano_ativo: boolean;
  /** Slug do plano (`starter` | `pro` | `premium`) quando existir no banco. */
  plano: string | null;
  consultas_fipe_utilizadas: number;
  consultas_fipe_limite: number;
  fipe_mes_referencia: string;
  creditos_premium: number;
  consultas_excedentes: number;
  valor_total_excedente: number;
  /** Saldo R$ pré-pago para FIPE além da cota (débito antes da consulta). */
  saldo_pre_pago: number;
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
    plano: "premium",
    consultas_fipe_utilizadas: 0,
    consultas_fipe_limite: 999_999,
    fipe_mes_referencia: mesReferenciaUtcAtual(),
    creditos_premium: 999_999,
    consultas_excedentes: 0,
    valor_total_excedente: 0,
    saldo_pre_pago: 999_999,
  };
}

/** Modo demo público: alinhado a `mockUserAcesso` (Premium, 999 FIPE / 999 créditos). */
export function usuarioDemoAcessoRow(identificador: string): UsuarioAcessoRow {
  const id = identificador.trim() || MOCK_DEMO_USER_ID;
  return {
    identificador: id,
    plano_ativo: true,
    plano: "premium",
    consultas_fipe_utilizadas: 0,
    consultas_fipe_limite: 999,
    fipe_mes_referencia: mesReferenciaUtcAtual(),
    creditos_premium: 999,
    consultas_excedentes: 0,
    valor_total_excedente: 0,
    saldo_pre_pago: 999,
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
      "identificador, plano_ativo, plano, consultas_fipe_utilizadas, consultas_fipe_limite, fipe_mes_referencia, creditos_premium, consultas_excedentes, valor_total_excedente, saldo_pre_pago"
    )
    .eq("identificador", id)
    .maybeSingle();

  if (error) {
    console.error("[usuario_acesso] leitura", error);
    return null;
  }
  if (!data) return null;

  let plano_ativo = Boolean(data.plano_ativo);
  let plano: string | null =
    typeof data.plano === "string" && data.plano.trim()
      ? data.plano.trim()
      : null;

  if (!devAcessoTotalAtivo() && !isPublicDemoMocksMode()) {
    const vig = await obterAssinaturaVigente(data.identificador);
    if (vig) {
      plano_ativo = true;
      plano = vig.plano;
    } else if (!acessoLegacySemAssinatura()) {
      plano_ativo = false;
    }
  }

  return {
    identificador: data.identificador,
    plano_ativo,
    plano,
    consultas_fipe_utilizadas: Number(data.consultas_fipe_utilizadas) || 0,
    consultas_fipe_limite: Math.max(
      0,
      Number(data.consultas_fipe_limite) || 0
    ),
    fipe_mes_referencia: String(data.fipe_mes_referencia ?? ""),
    creditos_premium: Math.max(0, Number(data.creditos_premium) || 0),
    consultas_excedentes: Math.max(0, Number(data.consultas_excedentes) || 0),
    valor_total_excedente: parseValorExcedenteDb(data.valor_total_excedente),
    saldo_pre_pago: parseValorExcedenteDb(
      (data as { saldo_pre_pago?: unknown }).saldo_pre_pago
    ),
  };
}

/**
 * Garante que o contador mensal de FIPE corresponde ao mês UTC atual.
 * Se mudou o mês, zera `consultas_fipe_utilizadas` e contadores de excedente no banco.
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
      consultas_excedentes: 0,
      valor_total_excedente: 0,
    })
    .eq("identificador", u.identificador);

  if (error) {
    console.error("[usuario_acesso] reset mês FIPE", error);
    return {
      ...u,
      fipe_mes_referencia: mes,
      consultas_fipe_utilizadas: 0,
      consultas_excedentes: 0,
      valor_total_excedente: 0,
    };
  }
  return {
    ...u,
    fipe_mes_referencia: mes,
    consultas_fipe_utilizadas: 0,
    consultas_excedentes: 0,
    valor_total_excedente: 0,
  };
}

export const MSG_SEM_PLANO =
  "Acesso exclusivo para assinantes Avaliador PRO. Assine um plano para analisar veículos.";

/** Resposta de bloqueio para blindagem / consultas premium (sem saldo). */
export const MSG_SEM_CREDITOS_PREMIUM = "Créditos insuficientes";

/** FIPE além da cota sem saldo pré-pago suficiente (bloqueio antes da API). */
export const MSG_LIMITE_FIPE_SEM_SALDO_PRE_PAGO =
  "Você atingiu o limite do plano. Adicione saldo para continuar.";

export {
  consultasFipeRestantes,
  podeConsumirFipe,
  podeUsarConsultaFipe,
} from "@/lib/fipe-cota-calculo";

type RegistrarConsumoFipeOpts = {
  placa: string;
  requestId?: string | null;
};

export type ResultadoRegistroConsumoFipe =
  | { ok: true; modo: "incluida" }
  | { ok: true; modo: "excedente"; valorCobradoReais: number }
  | { ok: false };

/**
 * Após match FIPE + persistência OK: incrementa cota **incluída** ou registra **excedente**
 * (com valor por plano). Não chamar em cache hit, falha de API ou sem match.
 * Auditoria: `FIPE_CONSUMIDO` ou `FIPE_EXCEDENTE_CONSUMIDO`.
 */
export async function registrarConsumoFipePosMatch(
  identificador: string,
  opts: RegistrarConsumoFipeOpts
): Promise<ResultadoRegistroConsumoFipe> {
  const id = identificador.trim();
  const placa = (opts.placa ?? "").trim().toUpperCase();
  if (!id || !placa) return { ok: false };
  if (devAcessoTotalAtivo() || isPublicDemoMocksMode()) {
    return { ok: true, modo: "incluida" };
  }

  const requestId =
    opts.requestId?.trim() ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `fipe-${Date.now()}`);

  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const bruto = await carregarUsuarioAcesso(id);
    if (!bruto) return { ok: false };
    const n = await normalizarMesContadorFipe(bruto);

    if (podeConsumirFipe(n)) {
      const atual = n.consultas_fipe_utilizadas;
      const { data, error } = await supabaseAdmin
        .from(TABELA)
        .update({
          consultas_fipe_utilizadas: atual + 1,
          atualizado_em: new Date().toISOString(),
        })
        .eq("identificador", id)
        .eq("consultas_fipe_utilizadas", atual)
        .select("consultas_fipe_utilizadas")
        .maybeSingle();

      if (error) {
        console.error("[usuario_acesso] incrementar FIPE incluída", error);
        return { ok: false };
      }
      if (data) {
        dispararPersistirEventoConsultaAuditoriaDb({
          clienteId: id,
          placa,
          evento: "FIPE_CONSUMIDO",
          tipoConsulta: "consulta_placa_mensal",
          detalhe: JSON.stringify({
            utilizadas_apos: atual + 1,
            limite: n.consultas_fipe_limite,
            mes_utc: n.fipe_mes_referencia,
          }),
          requestId: requestId ?? null,
        });
        return { ok: true, modo: "incluida" };
      }
      continue;
    }

    const preco = calcularPrecoExcedente(n.plano);
    const saldoAtual = roundMoney2(n.saldo_pre_pago);
    if (saldoAtual < preco) {
      return { ok: false };
    }
    const exAtual = n.consultas_excedentes;
    const vtAtual = n.valor_total_excedente;
    const novoVt = roundMoney2(vtAtual + preco);
    const novoSaldo = roundMoney2(saldoAtual - preco);

    const { data, error } = await supabaseAdmin
      .from(TABELA)
      .update({
        saldo_pre_pago: novoSaldo,
        consultas_excedentes: exAtual + 1,
        valor_total_excedente: novoVt,
        atualizado_em: new Date().toISOString(),
      })
      .eq("identificador", id)
      .eq("consultas_excedentes", exAtual)
      .eq("valor_total_excedente", vtAtual)
      .eq("saldo_pre_pago", saldoAtual)
      .select("consultas_excedentes")
      .maybeSingle();

    if (error) {
      console.error("[usuario_acesso] FIPE excedente pré-pago", error);
      return { ok: false };
    }
    if (data) {
      dispararPersistirEventoConsultaAuditoriaDb({
        clienteId: id,
        placa,
        evento: "FIPE_EXCEDENTE_CONSUMIDO",
        tipoConsulta: "consulta_placa_mensal",
        detalhe: JSON.stringify({
          valor_debitado_saldo_pre_pago: preco,
          saldo_pre_pago_apos: novoSaldo,
          plano: n.plano,
          excedentes_apos: exAtual + 1,
          valor_total_mes_apos: novoVt,
          mes_utc: n.fipe_mes_referencia,
        }),
        valorEvitarPerda: preco,
        requestId: requestId ?? null,
      });
      return { ok: true, modo: "excedente", valorCobradoReais: preco };
    }
  }
  return { ok: false };
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
