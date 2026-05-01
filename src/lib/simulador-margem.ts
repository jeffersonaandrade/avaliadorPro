/**
 * Simulador contábil de margem por usuário (assinatura + FIPE + excedente + créditos).
 * Função pura — usar só no servidor ou em relatórios; não substitui billing real.
 *
 * Constantes alinhadas ao modelo comercial atual; preços de plano/excedente espelham
 * `planos-marketing.ts` (manter sincronizado ao alterar pricing).
 */

export type PlanoSimulacaoMargem = "starter" | "pro" | "premium";

export type SimulacaoMargemInput = {
  plano: PlanoSimulacaoMargem;
  fipe_utilizadas: number;
  creditos_utilizados: number;
  /** Créditos premium avulsos vendidos no período (receita). */
  creditos_comprados: number;
};

export type SimulacaoMargemDetalhamento = {
  receita_assinatura: number;
  receita_excedente: number;
  receita_creditos: number;
  custo_fipe: number;
  custo_creditos: number;
};

export type SimulacaoMargemResultado = {
  receita: number;
  custo: number;
  lucro: number;
  /** `(lucro / receita) * 100` se receita > 0; senão `0`. */
  margem_percentual: number;
  detalhamento: SimulacaoMargemDetalhamento;
};

const CUSTO_FIPE_REAIS = 1.04;
const CUSTO_CREDITO_REAIS = 26.32;
const PRECO_CREDITO_AVULSO_REAIS = 39.9;

const PLANOS_SIMULADOR: Record<
  PlanoSimulacaoMargem,
  { preco: number; limite_fipe: number; creditos: number }
> = {
  starter: { preco: 39.9, limite_fipe: 10, creditos: 0 },
  pro: { preco: 99.9, limite_fipe: 30, creditos: 1 },
  premium: { preco: 189.9, limite_fipe: 60, creditos: 3 },
};

const PRECO_FIPE_EXCEDENTE_REAIS: Record<PlanoSimulacaoMargem, number> = {
  starter: 1.49,
  pro: 1.29,
  premium: 0.99,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function naoNegativo(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

/**
 * Projeta receita, custo e lucro mensais por usuário no modelo híbrido atual.
 */
export function simularMargemUsuario(
  input: SimulacaoMargemInput
): SimulacaoMargemResultado {
  const plano = input.plano;
  const fipeU = naoNegativo(input.fipe_utilizadas);
  const creditosU = naoNegativo(input.creditos_utilizados);
  const creditosC = naoNegativo(input.creditos_comprados);

  const cfg = PLANOS_SIMULADOR[plano];
  const precoExcedente = PRECO_FIPE_EXCEDENTE_REAIS[plano];

  const receita_assinatura = round2(cfg.preco);
  const excedenteQtd = Math.max(0, fipeU - cfg.limite_fipe);
  const receita_excedente = round2(excedenteQtd * precoExcedente);
  const receita_creditos = round2(creditosC * PRECO_CREDITO_AVULSO_REAIS);

  const receita = round2(
    receita_assinatura + receita_excedente + receita_creditos
  );

  const custo_fipe = round2(fipeU * CUSTO_FIPE_REAIS);
  const custo_creditos = round2(creditosU * CUSTO_CREDITO_REAIS);
  const custo = round2(custo_fipe + custo_creditos);

  const lucro = round2(receita - custo);
  const margem_percentual =
    receita > 0 ? round2((lucro / receita) * 100) : 0;

  return {
    receita,
    custo,
    lucro,
    margem_percentual,
    detalhamento: {
      receita_assinatura,
      receita_excedente,
      receita_creditos,
      custo_fipe,
      custo_creditos,
    },
  };
}
