"use server";

import { supabaseAdmin } from "@/lib/supabase";
import {
  AJUSTE_FIPE_PCT_MAX,
  AJUSTE_FIPE_PCT_MIN,
  calcularSimulacaoBase,
  calcularViabilidade,
  type EntradasViabilidade,
  type SimulacaoViabilidadePersistida,
  type VereditoViabilidade,
} from "@/lib/viabilidade";
import { MOCK_DEMO_USER_ID, isPublicDemoMocksMode } from "@/lib/demo-mocks";
import { carregarUsuarioAcesso } from "@/lib/usuario-acesso";
import { placaSchema } from "@/lib/validations";

export type SalvarSimulacaoInput = EntradasViabilidade & {
  placa: string;
  fipeReferenciaTexto: string;
  identificadorCliente: string;
  /** Quando false, persiste só simulação base (sem oferta/veredito FIPE). Default: true. */
  incluirContextoFipeMercado?: boolean;
  /** Venda realista usada no teto (cliente envia para alinhar persistência ao painel). */
  vendaRealistaReais?: number | null;
};

export async function salvarSimulacaoViabilidadeAction(
  input: SalvarSimulacaoInput
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const parsed = placaSchema.safeParse(input.placa);
  if (!parsed.success) {
    return { ok: false, erro: "Placa inválida." };
  }

  const idCliente =
    (input.identificadorCliente ?? "").trim() ||
    (isPublicDemoMocksMode() ? MOCK_DEMO_USER_ID : "");
  if (!idCliente) {
    return { ok: false, erro: "Sessão não identificada." };
  }
  const usuario = await carregarUsuarioAcesso(idCliente);
  if (!usuario?.plano_ativo) {
    return { ok: false, erro: "Plano inativo — não é possível salvar a simulação." };
  }

  const entradas: EntradasViabilidade = {
    precoPedido: Math.max(0, input.precoPedido),
    precoVendaEsperado: Math.max(0, input.precoVendaEsperado ?? 0),
    reparos: Math.max(0, input.reparos),
    transporte: Math.max(0, input.transporte),
    documentacao: Math.max(0, input.documentacao),
    multasDebitosManual: Math.max(
      0,
      Number.isFinite(input.multasDebitosManual)
        ? input.multasDebitosManual
        : 0
    ),
    outrosCustos: Math.max(0, input.outrosCustos),
    pctLucroDesejado: Math.max(0, Math.min(500, input.pctLucroDesejado)),
    pctGorduraNegociacao: Math.max(
      0,
      Math.min(100, input.pctGorduraNegociacao)
    ),
    ajusteFipePct: Math.max(
      AJUSTE_FIPE_PCT_MIN,
      Math.min(
        AJUSTE_FIPE_PCT_MAX,
        Number.isFinite(input.ajusteFipePct) ? input.ajusteFipePct : 0
      )
    ),
  };

  const usarFipeMercado = input.incluirContextoFipeMercado !== false;
  const vendaR =
    input.vendaRealistaReais != null &&
    Number.isFinite(input.vendaRealistaReais) &&
    input.vendaRealistaReais > 0
      ? input.vendaRealistaReais
      : null;

  const calc = usarFipeMercado
    ? calcularViabilidade(entradas, input.fipeReferenciaTexto, {
        vendaRealistaReais: vendaR,
      })
    : (() => {
        const base = calcularSimulacaoBase(entradas);
        return {
          custoTotal: base.custoTotal,
          precoVendaSugerido: base.precoVendaSugerido,
          margemRealSobreFipePct: null as number | null,
          margemRealProjecaoPct: null as number | null,
          lucroProjetadoMargem: null as number | null,
          veredito: "indefinido" as VereditoViabilidade,
          ofertaMaximaSugerida: null as number | null,
          ofertaInicialAncoragem: null as number | null,
        };
      })();

  const payload: SimulacaoViabilidadePersistida = {
    ...entradas,
    ...calc,
    atualizadoEm: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("consultas_veiculos")
    .update({ simulacao_viabilidade: payload as unknown as Record<string, unknown> })
    .eq("placa", parsed.data);

  if (error) {
    console.error("[viabilidade] persistência", error);
    return { ok: false, erro: "Não foi possível salvar a simulação." };
  }

  return { ok: true };
}
