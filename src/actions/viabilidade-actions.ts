"use server";

import { supabaseAdmin } from "@/lib/supabase";
import {
  AJUSTE_FIPE_PCT_MAX,
  AJUSTE_FIPE_PCT_MIN,
  calcularViabilidade,
  type EntradasViabilidade,
  type SimulacaoViabilidadePersistida,
} from "@/lib/viabilidade";
import { placaSchema } from "@/lib/validations";

export type SalvarSimulacaoInput = EntradasViabilidade & {
  placa: string;
  fipeTexto: string;
};

export async function salvarSimulacaoViabilidadeAction(
  input: SalvarSimulacaoInput
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const parsed = placaSchema.safeParse(input.placa);
  if (!parsed.success) {
    return { ok: false, erro: "Placa inválida." };
  }

  const entradas: EntradasViabilidade = {
    precoPedido: Math.max(0, input.precoPedido),
    reparos: Math.max(0, input.reparos),
    transporte: Math.max(0, input.transporte),
    documentacao: Math.max(0, input.documentacao),
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

  const calc = calcularViabilidade(entradas, input.fipeTexto);

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
