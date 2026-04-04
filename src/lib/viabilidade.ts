/** Converte string FIPE tipo "R$ 43.243,00" ou "—" em número (reais). */
export function parseValorBRL(texto: string): number {
  if (!texto || texto.trim() === "—") return NaN;
  const limpo = texto
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : NaN;
}

export function formatarMoedaBRL(valor: number): string {
  if (!Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/** Teto em centavos (999.999.999,99 reais). */
export const MAX_CENTAVOS_MOEDA = 99_999_999_999;

/**
 * Formata centavos (inteiro) para exibição pt-BR no campo, sem R$.
 * O valor exibido é sempre centavos ÷ 100 com 2 decimais (máscara tipo terminal).
 */
export function formatarCentavosMoedaCampo(centavos: number): string {
  if (!Number.isFinite(centavos) || centavos <= 0) return "";
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** @deprecated Preferir formatarCentavosMoedaCampo(Math.round(reais * 100)). */
export function formatarMoedaCampoDigitos(valor: number): string {
  if (!Number.isFinite(valor) || valor <= 0) return "";
  return formatarCentavosMoedaCampo(Math.round(valor * 100));
}

/**
 * Máscara tipo caixa / terminal: só os dígitos importam, interpretados como **centavos**.
 * Ex.: "1"→1¢→0,01 · "30000"→30.000¢→300,00 · "3000000"→30.000,00.
 * Vírgula, ponto, R$ e espaços são ignorados (o formatador reinsere milhar).
 */
export function centavosDeInputMoedaBr(texto: string): number {
  const apenasNumeros = texto.replace(/\D/g, "").slice(0, 14);
  if (!apenasNumeros) return 0;
  const n = parseInt(apenasNumeros, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(0, n), MAX_CENTAVOS_MOEDA);
}

/** Reais a partir do texto do campo (para onChange). */
export function reaisDeInputMoedaBr(texto: string): number {
  return centavosDeInputMoedaBr(texto) / 100;
}

export function formatarPercentual(valor: number, casas = 1): string {
  if (!Number.isFinite(valor)) return "—";
  return `${valor >= 0 ? "+" : ""}${valor.toFixed(casas).replace(".", ",")}%`;
}

export type VereditoViabilidade = "viavel" | "arriscado" | "atencao" | "indefinido";

/** Percentual que afasta a oferta inicial da oferta máxima (100% = oferta inicial zero). */
export const GORDURA_NEGOCIACAO_PADRAO = 10;

/** Limite do ajuste % sobre a FIPE (só afeta teto de negociação). */
export const AJUSTE_FIPE_PCT_MIN = -100;
export const AJUSTE_FIPE_PCT_MAX = 100;

export type EntradasViabilidade = {
  /** Preço pedido pelo vendedor — não entra em custo total; só persistência / análise na UI. */
  precoPedido: number;
  reparos: number;
  transporte: number;
  documentacao: number;
  /** Comissão, garantia, pátio, imprevistos etc. */
  outrosCustos: number;
  pctLucroDesejado: number;
  /** Distância entre oferta máxima e oferta inicial (ex.: 10 → inicial = máx × 90%). */
  pctGorduraNegociacao: number;
  /**
   * Ajuste sobre o valor de tabela (ex.: −10 = referência 10% abaixo da FIPE).
   * Usado apenas em oferta máxima / inicial; margem e veredito seguem a FIPE original.
   */
  ajusteFipePct: number;
};

export type ResultadoViabilidade = {
  custoTotal: number;
  precoVendaSugerido: number;
  /** (vendaSugerida - FIPE) / FIPE * 100 — null se FIPE inválida */
  margemRealSobreFipePct: number | null;
  veredito: VereditoViabilidade;
  /**
   * Maior preço de compra possível mantendo venda sugerida ≤ FIPE e o % de lucro sobre custo total.
   * null se FIPE inválida.
   */
  ofertaMaximaSugerida: number | null;
  /** Ponto de ancoragem: abaixo da máxima conforme % de gordura do lojista. null se FIPE inválida. */
  ofertaInicialAncoragem: number | null;
};

const LIMIAR_CUSTO_PROXIMO_FIPE = 0.82;
const LIMIAR_VENDA_VIAVEL = 0.9;

function arredondarReais2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Teto de referência = FIPE (ou FIPE ajustada pelo lojista). Com lucro p% sobre custo total:
 * venda = custoTotal * (1+p/100) ≤ referência (na prática o parâmetro já vem ajustado quando aplicável).
 * Oferta máxima de compra = referência/(1+p/100) − (reparos+transporte+doc+outros).
 */
export function calcularFaixaNegociacao(
  entradas: EntradasViabilidade,
  fipeReferenciaNegociacao: number
): { ofertaMaximaSugerida: number | null; ofertaInicialAncoragem: number | null } {
  if (
    !Number.isFinite(fipeReferenciaNegociacao) ||
    fipeReferenciaNegociacao <= 0
  ) {
    return { ofertaMaximaSugerida: null, ofertaInicialAncoragem: null };
  }
  const pct = Math.max(0, entradas.pctLucroDesejado);
  const divisor = 1 + pct / 100;
  const custosFixos =
    (Number.isFinite(entradas.reparos) ? entradas.reparos : 0) +
    (Number.isFinite(entradas.transporte) ? entradas.transporte : 0) +
    (Number.isFinite(entradas.documentacao) ? entradas.documentacao : 0) +
    (Number.isFinite(entradas.outrosCustos) ? entradas.outrosCustos : 0);
  const custoTotalMaximo = fipeReferenciaNegociacao / divisor;
  const ofertaMaximaSugerida = arredondarReais2(
    Math.max(0, custoTotalMaximo - custosFixos)
  );
  const g = Number.isFinite(entradas.pctGorduraNegociacao)
    ? Math.min(100, Math.max(0, entradas.pctGorduraNegociacao))
    : GORDURA_NEGOCIACAO_PADRAO;
  const fatorInicial = 1 - g / 100;
  const ofertaInicialAncoragem = arredondarReais2(
    Math.max(0, ofertaMaximaSugerida * fatorInicial)
  );
  return { ofertaMaximaSugerida, ofertaInicialAncoragem };
}

export function calcularVeredito(
  fipeNum: number,
  custoTotal: number,
  precoVendaSugerido: number
): VereditoViabilidade {
  if (!Number.isFinite(fipeNum) || fipeNum <= 0) return "indefinido";

  const rCusto = custoTotal / fipeNum;
  const rVenda = precoVendaSugerido / fipeNum;

  if (rCusto >= LIMIAR_CUSTO_PROXIMO_FIPE) return "arriscado";
  if (rVenda > 1) return "arriscado";
  if (rVenda <= LIMIAR_VENDA_VIAVEL) return "viavel";
  return "atencao";
}

export function calcularViabilidade(
  entradas: EntradasViabilidade,
  fipeTexto: string
): ResultadoViabilidade {
  const {
    reparos,
    transporte,
    documentacao,
    outrosCustos,
    pctLucroDesejado,
  } = entradas;

  const custoTotal =
    (Number.isFinite(reparos) ? reparos : 0) +
    (Number.isFinite(transporte) ? transporte : 0) +
    (Number.isFinite(documentacao) ? documentacao : 0) +
    (Number.isFinite(outrosCustos) ? outrosCustos : 0);

  const pct = Number.isFinite(pctLucroDesejado) ? pctLucroDesejado : 0;
  const precoVendaSugerido = custoTotal * (1 + Math.max(0, pct) / 100);

  const fipeNum = parseValorBRL(fipeTexto);
  let margemRealSobreFipePct: number | null = null;
  if (Number.isFinite(fipeNum) && fipeNum > 0) {
    margemRealSobreFipePct =
      ((precoVendaSugerido - fipeNum) / fipeNum) * 100;
  }

  const veredito = calcularVeredito(fipeNum, custoTotal, precoVendaSugerido);

  const ajusteBruto = Number.isFinite(entradas.ajusteFipePct)
    ? entradas.ajusteFipePct
    : 0;
  const ajusteFipePct = Math.max(
    AJUSTE_FIPE_PCT_MIN,
    Math.min(AJUSTE_FIPE_PCT_MAX, ajusteBruto)
  );
  const fipeParaNegociacao =
    Number.isFinite(fipeNum) && fipeNum > 0
      ? arredondarReais2(fipeNum * (1 + ajusteFipePct / 100))
      : NaN;

  const { ofertaMaximaSugerida, ofertaInicialAncoragem } =
    calcularFaixaNegociacao(entradas, fipeParaNegociacao);

  return {
    custoTotal,
    precoVendaSugerido,
    margemRealSobreFipePct,
    veredito,
    ofertaMaximaSugerida,
    ofertaInicialAncoragem,
  };
}

export type SimulacaoViabilidadePersistida = EntradasViabilidade &
  ResultadoViabilidade & {
    atualizadoEm: string;
  };

export function simulacaoFromJSON(
  raw: unknown
): Partial<EntradasViabilidade> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const num = (k: string) => {
    const v = o[k];
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
  };
  return {
    precoPedido: num("precoPedido") ?? num("precoCompra"),
    reparos: num("reparos"),
    transporte: num("transporte"),
    documentacao: num("documentacao"),
    outrosCustos: num("outrosCustos"),
    pctLucroDesejado: num("pctLucroDesejado"),
    pctGorduraNegociacao: num("pctGorduraNegociacao"),
    ajusteFipePct: num("ajusteFipePct"),
  };
}
