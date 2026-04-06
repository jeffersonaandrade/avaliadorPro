import {
  extrairFlagsHistoricoVeiculo,
  FATORES_RISCO,
} from "@/components/formulario-viabilidade/historico-veiculo";
import {
  dadosLeilaoSemConsultasPremium,
  extrairRiscosCarregadosDeDadosLeilao,
  mergeFlagsComConsultasPremium,
} from "@/lib/consultas-risco-premium";
import {
  AJUSTE_FIPE_PCT_MAX,
  AJUSTE_FIPE_PCT_MIN,
  parseValorBRL,
} from "@/lib/viabilidade";

/** Limites alinhados aos campos de impacto na UI (FormularioViabilidade). */
export const PCT_IMPACTO_RISCO_MIN = -100;
export const PCT_IMPACTO_RISCO_MAX = 0;

/** Valores padrão em pontos percentuais (ex.: −20), espelho de `FATORES_RISCO` da UI. */
export const PCT_IMPACTO_RISCO_PADRAO = {
  leilao: Math.round(FATORES_RISCO.leilao * 100),
  sinistro: Math.round(FATORES_RISCO.sinistro * 100),
  roubo: Math.round(FATORES_RISCO.roubo * 100),
  gravame: Math.round(FATORES_RISCO.gravame * 100),
} as const;

export type FlagsImpactoFipe = {
  leilao: boolean;
  sinistro: boolean;
  roubo: boolean;
  gravame: boolean;
  renainf: boolean;
};

export type DecimaisImpactoPorTipo = {
  leilao: number;
  sinistro: number;
  roubo: number;
  gravame: number;
};

function clampPctRiscoUi(v: number): number {
  return Math.max(
    PCT_IMPACTO_RISCO_MIN,
    Math.min(PCT_IMPACTO_RISCO_MAX, v)
  );
}

/**
 * Converte % salvo na simulação (ex.: −20 = −20%) em decimal (ex.: −0,2).
 * Se ausente ou inválido, usa o fator padrão (decimal, ex.: −0,2).
 */
export function decimalDePercentualSalvoOuPadrao(
  valorSalvo: unknown,
  fallbackDecimal: number
): number {
  if (typeof valorSalvo === "number" && Number.isFinite(valorSalvo)) {
    const pct = clampPctRiscoUi(valorSalvo);
    return pct / 100;
  }
  return fallbackDecimal;
}

/**
 * Decimais de impacto por tipo a partir de `simulacao_viabilidade` (JSON).
 * Renainf não é persistido — continua com `FATORES_RISCO.renainf` na agregação.
 */
export function resolverDecimaisImpactoDeSimulacao(
  simulacaoViabilidade: unknown
): DecimaisImpactoPorTipo {
  const s =
    simulacaoViabilidade && typeof simulacaoViabilidade === "object"
      ? (simulacaoViabilidade as Record<string, unknown>)
      : {};
  return {
    leilao: decimalDePercentualSalvoOuPadrao(
      s.percentualLeilao,
      FATORES_RISCO.leilao
    ),
    sinistro: decimalDePercentualSalvoOuPadrao(
      s.percentualSinistro,
      FATORES_RISCO.sinistro
    ),
    roubo: decimalDePercentualSalvoOuPadrao(
      s.percentualRoubo,
      FATORES_RISCO.roubo
    ),
    gravame: decimalDePercentualSalvoOuPadrao(
      s.percentualGravame,
      FATORES_RISCO.gravame
    ),
  };
}

/**
 * Soma dos impactos (decimais) conforme flags ativas + Renainf padrão.
 * `bruto` antes do teto −50%; `comTeto` usado na FIPE ajustada.
 */
export function impactoRiscoAgregado(
  flags: FlagsImpactoFipe,
  dec: DecimaisImpactoPorTipo
): { bruto: number; comTeto: number } {
  const bruto =
    (flags.leilao ? dec.leilao : 0) +
    (flags.sinistro ? dec.sinistro : 0) +
    (flags.roubo ? dec.roubo : 0) +
    (flags.gravame ? dec.gravame : 0) +
    (flags.renainf ? FATORES_RISCO.renainf : 0);
  return { bruto, comTeto: Math.max(-0.5, bruto) };
}

function arredondarReaisNaoNegativos2Casas(v: number): number {
  const x = Number.isFinite(v) ? v : 0;
  return Math.max(0, Math.round(x * 100) / 100);
}

/**
 * Alinha à memória de cálculo da UI (sem `MIN` com preço de venda esperado):
 * base sem risco = FIPE × (1 + ajuste mercado);
 * base com risco = FIPE × (1 + ajuste + impacto agregado dos fatores ativos).
 *
 * Percentuais de leilão/sinistro/roubo/gravame vêm de `simulacao_viabilidade` quando
 * existirem; senão, dos mesmos padrões da UI (`FATORES_RISCO`).
 * Retorno em reais, ≥ 0, 2 casas decimais.
 */
export function calcularValorEvitarPerdaReais(input: {
  fipeTexto: string;
  dadosLeilao: Record<string, unknown> | null | undefined;
  simulacaoViabilidade: unknown | null | undefined;
}): number | null {
  const fipe = parseValorBRL(input.fipeTexto ?? "");
  if (!Number.isFinite(fipe) || fipe <= 0) return null;

  const root = input.dadosLeilao ?? {};
  const flagsBase = extrairFlagsHistoricoVeiculo(
    dadosLeilaoSemConsultasPremium(root)
  );
  const riscos = extrairRiscosCarregadosDeDadosLeilao(root);
  const flags = mergeFlagsComConsultasPremium(flagsBase, riscos);

  const dec = resolverDecimaisImpactoDeSimulacao(input.simulacaoViabilidade);
  const { comTeto: impactoTotal } = impactoRiscoAgregado(flags, dec);

  let ajustePct = 0;
  if (
    input.simulacaoViabilidade &&
    typeof input.simulacaoViabilidade === "object"
  ) {
    const s = input.simulacaoViabilidade as Record<string, unknown>;
    const a = s.ajusteFipePct;
    if (typeof a === "number" && Number.isFinite(a)) {
      ajustePct = Math.max(
        AJUSTE_FIPE_PCT_MIN,
        Math.min(AJUSTE_FIPE_PCT_MAX, a)
      );
    }
  }

  const ajusteDec = ajustePct / 100;
  const baseSemRisco = fipe * (1 + ajusteDec);
  const baseComRisco = fipe * (1 + ajusteDec + impactoTotal);
  const raw = baseSemRisco - baseComRisco;
  return arredondarReaisNaoNegativos2Casas(raw);
}
