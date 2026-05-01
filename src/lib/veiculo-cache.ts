import "server-only";

import { supabaseAdmin } from "@/lib/supabase";

/** TTL alinhado ao comentário em `consultas_veiculos` / `database.sql`. */
export const TTL_CACHE_VEICULO_DIAS = 30;
const MS_POR_DIA = 86_400_000;

/** Linha mínima de `consultas_veiculos` para cache de busca por placa. */
export type LinhaConsultaVeiculo = {
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  fipe: string;
  chassi: string | null;
  cor: string | null;
  combustivel: string | null;
  tipo_veiculo: string | null;
  mes_referencia_fipe: string | null;
  aviso_fipe: string | null;
  criado_em: string;
  atualizado_em: string | null;
  dados_leilao: Record<string, unknown> | null;
  simulacao_viabilidade: unknown | null;
};

const COLUNAS_CACHE =
  "placa, marca, modelo, ano, fipe, chassi, cor, combustivel, tipo_veiculo, mes_referencia_fipe, aviso_fipe, criado_em, atualizado_em, dados_leilao, simulacao_viabilidade";

/**
 * Referência temporal do cache: equivalente SQL `coalesce(atualizado_em, criado_em)`.
 */
export function referenciaTemporalCacheVeiculo(linha: {
  criado_em: string;
  atualizado_em: string | null;
}): string {
  const a = linha.atualizado_em?.trim();
  if (a) return a;
  return linha.criado_em?.trim() ?? "";
}

export function cacheVeiculoDentroDoTtl(referenciaIso: string): boolean {
  const t = Date.parse(referenciaIso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < TTL_CACHE_VEICULO_DIAS * MS_POR_DIA;
}

export type EstadoCacheConsultaVeiculo =
  | { status: "hit"; linha: LinhaConsultaVeiculo }
  | { status: "expirado"; linha: LinhaConsultaVeiculo }
  | { status: "ausente" };

/**
 * Uma leitura em `consultas_veiculos`: classifica hit (TTL ok), expirado ou ausente.
 * Idade = `coalesce(atualizado_em, criado_em)` (espelhado em `referenciaTemporalCacheVeiculo`).
 */
export async function obterEstadoCacheConsultaVeiculo(
  placaNorm: string
): Promise<EstadoCacheConsultaVeiculo> {
  const placa = placaNorm.trim().toUpperCase();
  if (!placa) return { status: "ausente" };

  const { data, error } = await supabaseAdmin
    .from("consultas_veiculos")
    .select(COLUNAS_CACHE)
    .eq("placa", placa)
    .maybeSingle();

  if (error) {
    console.error("[veiculo-cache] leitura", error);
    return { status: "ausente" };
  }
  if (!data) return { status: "ausente" };

  const linha = data as LinhaConsultaVeiculo;
  const ref = referenciaTemporalCacheVeiculo(linha);
  if (cacheVeiculoDentroDoTtl(ref)) return { status: "hit", linha };
  return { status: "expirado", linha };
}

/**
 * Retorna a linha apenas se existir e estiver dentro do TTL (≤ 30 dias desde
 * `coalesce(atualizado_em, criado_em)`). Caso contrário `null`.
 */
export async function buscarVeiculoCacheValido(
  placaNorm: string
): Promise<LinhaConsultaVeiculo | null> {
  const r = await obterEstadoCacheConsultaVeiculo(placaNorm);
  return r.status === "hit" ? r.linha : null;
}
