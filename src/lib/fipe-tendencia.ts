export type TendenciaFipe = "subindo" | "caindo" | "estavel";

export type AnaliseTendenciaFipe = {
  tendencia: TendenciaFipe;
  variacaoPercentual: number;
  variacaoReais: number;
  precoAtual: number;
  preco12MesesAtras: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseValor(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v !== "string") return NaN;
  const raw = v.trim().replace(/\s/g, "").replace(/R\$/gi, "");
  const limpo =
    raw.includes(",") && raw.includes(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.includes(",")
        ? raw.replace(",", ".")
        : raw;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : NaN;
}

function ordenarMeses(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b));
}

/**
 * Recebe histórico de FIPE em formato `YYYY_MM` => valor.
 * Ex.: {"2024_05": "45989.00", "2025_04": "43208.00"}
 */
export function analisarTendenciaFipe(
  historico: Record<string, unknown> | null | undefined
): AnaliseTendenciaFipe | null {
  if (!historico || typeof historico !== "object") return null;
  const meses = ordenarMeses(Object.keys(historico));
  if (meses.length < 2) return null;

  const primeiroMes = meses[0];
  const ultimoMes = meses[meses.length - 1];
  const antigo = parseValor(historico[primeiroMes]);
  const atual = parseValor(historico[ultimoMes]);
  if (!Number.isFinite(antigo) || !Number.isFinite(atual) || antigo <= 0) {
    return null;
  }

  const variacaoReais = round2(atual - antigo);
  const variacaoPercentual = round2(((atual - antigo) / antigo) * 100);
  let tendencia: TendenciaFipe = "estavel";
  if (variacaoPercentual > 3) tendencia = "subindo";
  else if (variacaoPercentual < -3) tendencia = "caindo";

  return {
    tendencia,
    variacaoPercentual,
    variacaoReais,
    precoAtual: round2(atual),
    preco12MesesAtras: round2(antigo),
  };
}

export function gerarInsightFipe(
  tendencia: TendenciaFipe,
  _variacaoPercentual: number
): string {
  if (tendencia === "caindo") {
    return "Veiculo em tendencia de desvalorizacao nos ultimos 12 meses. Use isso como argumento para negociar abaixo da FIPE.";
  }
  if (tendencia === "subindo") {
    return "Veiculo com valorizacao recente. Pode haver menor margem de negociacao.";
  }
  return "Preco estavel no ultimo ano. Negociacao depende mais do estado do veiculo.";
}

