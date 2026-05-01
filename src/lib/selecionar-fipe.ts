export type InformacaoFipeEntrada = {
  codigo_fipe?: string;
  modelo_versao?: string;
  preco?: string | number;
  mes_referencia?: string;
  historico?: Record<string, string | number>;
};

type SelecionarMelhorFipeInput = {
  modeloVeiculo: string;
  anoModelo: number;
  informacoesFipe: InformacaoFipeEntrada[];
};

export type SelecionarMelhorFipeResultado = {
  item: InformacaoFipeEntrada | null;
  score: number;
  fallback: boolean;
  avisoFipe?: string;
};

const AVISO_FALLBACK_MULTIPLAS =
  "Multiplas versoes FIPE encontradas; usada a primeira opcao retornada pela fonte.";

function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensRelevantes(s: string): string[] {
  const stop = new Set(["de", "do", "da", "com", "e", "ou", "flex", "plus"]);
  return normalizarTexto(s)
    .split(" ")
    .filter((t) => t.length >= 2 && !stop.has(t));
}

function extrairMotorizacoes(s: string): string[] {
  const n = normalizarTexto(s);
  return n.match(/\b\d\.\d\b|\b\d{3,4}cc\b|\b\d{1,2}v\b/g) ?? [];
}

function extrairCambio(s: string): "manual" | "automatico" | null {
  const n = normalizarTexto(s);
  if (
    n.includes("automatic") ||
    n.includes("aut ") ||
    n.endsWith(" aut") ||
    n.includes(" cvt")
  ) {
    return "automatico";
  }
  if (n.includes("manual") || n.includes(" mec")) return "manual";
  return null;
}

function precoValido(preco: string | number | undefined): boolean {
  const n = typeof preco === "number" ? preco : Number(preco ?? NaN);
  return Number.isFinite(n) && n > 0;
}

function pontuarItem(
  modeloVeiculo: string,
  item: InformacaoFipeEntrada
): number {
  const modeloApi = item.modelo_versao ?? "";
  const modeloNorm = normalizarTexto(modeloVeiculo);
  const apiNorm = normalizarTexto(modeloApi);
  let score = 0;

  if (!apiNorm) return score;
  if (apiNorm === modeloNorm) score += 100;

  const toksModelo = tokensRelevantes(modeloVeiculo);
  const principal = toksModelo.slice(0, 2).join(" ").trim();
  if (principal && apiNorm.includes(principal)) score += 50;

  const motos = extrairMotorizacoes(modeloVeiculo);
  if (motos.length > 0 && motos.some((m) => apiNorm.includes(m))) score += 20;

  const cambio = extrairCambio(modeloVeiculo);
  if (cambio === "manual" && (apiNorm.includes("manual") || apiNorm.includes(" mec")))
    score += 10;
  if (
    cambio === "automatico" &&
    (apiNorm.includes("automatic") || apiNorm.includes(" aut") || apiNorm.includes("cvt"))
  ) {
    score += 10;
  }

  if (precoValido(item.preco)) score += 5;
  return score;
}

export function selecionarMelhorFipe(
  input: SelecionarMelhorFipeInput
): SelecionarMelhorFipeResultado {
  const itens = input.informacoesFipe ?? [];
  if (itens.length === 0) {
    return { item: null, score: 0, fallback: true };
  }

  let melhor = itens[0];
  let melhorScore = pontuarItem(input.modeloVeiculo, melhor);
  for (let i = 1; i < itens.length; i++) {
    const s = pontuarItem(input.modeloVeiculo, itens[i]);
    if (s > melhorScore) {
      melhorScore = s;
      melhor = itens[i];
    }
  }

  const scoreConfiavel = melhorScore >= 50;
  if (!scoreConfiavel) {
    return {
      item: itens[0],
      score: melhorScore,
      fallback: true,
      avisoFipe: AVISO_FALLBACK_MULTIPLAS,
    };
  }

  return {
    item: melhor,
    score: melhorScore,
    fallback: false,
  };
}

