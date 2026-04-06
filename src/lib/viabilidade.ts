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
  /**
   * Estimativa de venda na vitrine. Se &gt; 0, simulação base vira market-minus (compra alvo).
   * Se 0, mantém cost-plus (venda = custos × (1 + lucro %)).
   */
  precoVendaEsperado: number;
  reparos: number;
  transporte: number;
  documentacao: number;
  /**
   * Multas e débitos estimados (entrada manual no painel).
   * Entram no teto de compra e no lucro projetado; não disparam chamadas extras à API.
   */
  multasDebitosManual: number;
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
  /**
   * (lucro_projetado / (preço_compra + reparos + documentação)) × 100.
   * Lucro projetado = venda_realista − compra − reparos − documentação − multas − transporte − outros.
   */
  margemRealProjecaoPct: number | null;
  /** Lucro em reais usado na margem acima (null se margem indisponível). */
  lucroProjetadoMargem: number | null;
  veredito: VereditoViabilidade;
  /**
   * Teto com base na **venda realista** (não só FIPE tabela): venda/(1+lucro%) − custos operacionais.
   * null se referência de venda inválida.
   */
  ofertaMaximaSugerida: number | null;
  /** Ponto de ancoragem: abaixo da máxima conforme % de gordura do lojista. null se FIPE inválida. */
  ofertaInicialAncoragem: number | null;
};

const LIMIAR_CUSTO_PROXIMO_FIPE = 0.82;
const LIMIAR_VENDA_VIAVEL = 0.9;

/** Arredondamento monetário a 2 casas (mesma regra da UI). */
export function arredondarReais2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Teto de compra = venda_realista / (1 + lucro%/100) − (reparos + transporte + documentação + multas manuais + outros).
 * A venda realista vem da referência de mercado ajustada (FIPE × fatores), não da FIPE “seca”.
 */
export function calcularFaixaNegociacao(
  entradas: EntradasViabilidade,
  vendaRealistaReais: number
): { ofertaMaximaSugerida: number | null; ofertaInicialAncoragem: number | null } {
  if (!Number.isFinite(vendaRealistaReais) || vendaRealistaReais <= 0) {
    return { ofertaMaximaSugerida: null, ofertaInicialAncoragem: null };
  }
  const pct = Math.max(0, entradas.pctLucroDesejado);
  const divisor = 1 + pct / 100;
  const multas = Number.isFinite(entradas.multasDebitosManual)
    ? Math.max(0, entradas.multasDebitosManual)
    : 0;
  const custosFixos =
    (Number.isFinite(entradas.reparos) ? entradas.reparos : 0) +
    (Number.isFinite(entradas.transporte) ? entradas.transporte : 0) +
    (Number.isFinite(entradas.documentacao) ? entradas.documentacao : 0) +
    multas +
    (Number.isFinite(entradas.outrosCustos) ? entradas.outrosCustos : 0);
  const ofertaMaximaSugerida = arredondarReais2(
    Math.max(0, vendaRealistaReais / divisor - custosFixos)
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

/**
 * Reduz teto e âncora de negociação pelo total estimado de multas (Renainf),
 * mantendo a mesma proporção entre oferta inicial e teto.
 */
export function ajustarNegociacaoDescontoRenainf(
  ofertaMaxima: number | null,
  ofertaInicial: number | null,
  descontoRenainfReais: number
): { ofertaMaximaSugerida: number | null; ofertaInicialAncoragem: number | null } {
  const desc = Number.isFinite(descontoRenainfReais)
    ? Math.max(0, descontoRenainfReais)
    : 0;
  if (desc <= 0) {
    return {
      ofertaMaximaSugerida: ofertaMaxima,
      ofertaInicialAncoragem: ofertaInicial,
    };
  }
  if (ofertaMaxima === null || !Number.isFinite(ofertaMaxima)) {
    return { ofertaMaximaSugerida: null, ofertaInicialAncoragem: null };
  }
  const novaMax = arredondarReais2(Math.max(0, ofertaMaxima - desc));
  if (
    ofertaInicial === null ||
    !Number.isFinite(ofertaInicial) ||
    ofertaMaxima <= 0
  ) {
    return {
      ofertaMaximaSugerida: novaMax,
      ofertaInicialAncoragem: ofertaInicial,
    };
  }
  const ratio = ofertaInicial / ofertaMaxima;
  const novaInicial = arredondarReais2(Math.max(0, novaMax * ratio));
  return {
    ofertaMaximaSugerida: novaMax,
    ofertaInicialAncoragem: novaInicial,
  };
}

export function calcularVeredito(
  fipeReferencia: number,
  custoTotal: number,
  precoVendaSugerido: number
): VereditoViabilidade {
  if (!Number.isFinite(fipeReferencia) || fipeReferencia <= 0)
    return "indefinido";

  const rCusto = custoTotal / fipeReferencia;
  const rVenda = precoVendaSugerido / fipeReferencia;

  if (rCusto >= LIMIAR_CUSTO_PROXIMO_FIPE) return "arriscado";
  if (rVenda > 1) return "arriscado";
  if (rVenda <= LIMIAR_VENDA_VIAVEL) return "viavel";
  return "atencao";
}

/**
 * Lucro projetado e margem % sobre (compra + reparos + documentação), conforme regra de negócio do painel.
 */
export function calcularLucroEMargemProjecao(
  vendaRealista: number,
  entradas: EntradasViabilidade
): { lucroProjetado: number; margemRealProjecaoPct: number | null } {
  if (!Number.isFinite(vendaRealista) || vendaRealista <= 0) {
    return { lucroProjetado: 0, margemRealProjecaoPct: null };
  }
  const P = Number.isFinite(entradas.precoPedido)
    ? Math.max(0, entradas.precoPedido)
    : 0;
  const R = Number.isFinite(entradas.reparos) ? Math.max(0, entradas.reparos) : 0;
  const D = Number.isFinite(entradas.documentacao)
    ? Math.max(0, entradas.documentacao)
    : 0;
  const M = Number.isFinite(entradas.multasDebitosManual)
    ? Math.max(0, entradas.multasDebitosManual)
    : 0;
  const T = Number.isFinite(entradas.transporte)
    ? Math.max(0, entradas.transporte)
    : 0;
  const O = Number.isFinite(entradas.outrosCustos)
    ? Math.max(0, entradas.outrosCustos)
    : 0;
  const custoTotalVeiculo = P + R + D;
  const lucroProjetado = arredondarReais2(
    vendaRealista - P - R - D - M - T - O
  );
  const margemRealProjecaoPct =
    custoTotalVeiculo > 0
      ? Math.round((lucroProjetado / custoTotalVeiculo) * 10000) / 100
      : null;
  return { lucroProjetado, margemRealProjecaoPct };
}

/** Semáforo do painel / PDF: margem sobre (compra + reparos + documentação). */
export function vereditoPorMargemRealProjecao(
  margemPct: number | null
): VereditoViabilidade {
  if (margemPct === null || !Number.isFinite(margemPct)) return "indefinido";
  if (margemPct < 5) return "arriscado";
  if (margemPct <= 15) return "atencao";
  return "viavel";
}

/**
 * O semáforo (🔴🟡🟢) só deve usar cores reais quando a margem reflete todos os insumos
 * da decisão: compra, custos operacionais, venda realista (FIPE no contexto) e meta de lucro %.
 * Alinha ao teto: venda realista − (R+T+D+M+O) após aplicar lucro % na oferta máxima.
 */
export function vereditoDadosCompletosParaSemaforo(
  entradas: EntradasViabilidade,
  opts: { contextoFipeMercadoAtivo: boolean; vendaRealistaReais: number }
): boolean {
  if (!opts.contextoFipeMercadoAtivo) return false;
  if (
    !Number.isFinite(opts.vendaRealistaReais) ||
    opts.vendaRealistaReais <= 0
  ) {
    return false;
  }
  const P = entradas.precoPedido;
  if (!Number.isFinite(P) || P <= 0) return false;
  const custos: (keyof EntradasViabilidade)[] = [
    "reparos",
    "transporte",
    "documentacao",
    "multasDebitosManual",
    "outrosCustos",
  ];
  for (const k of custos) {
    const v = entradas[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return false;
  }
  const lucro = entradas.pctLucroDesejado;
  if (typeof lucro !== "number" || !Number.isFinite(lucro) || lucro < 0) {
    return false;
  }
  return true;
}

/** Resultado da simulação base (sem FIPE). */
export type ResultadoSimulacaoBase = {
  custoTotal: number;
  /**
   * Valor de venda usado no motor (veredito / margem FIPE): esperado no market-minus,
   * ou custo×(1+p) no cost-plus.
   */
  precoVendaSugerido: number;
  modo: "cost_plus" | "market_minus";
  precoCompraAlvo: number | null;
  lucroEstimado: number | null;
  margemSobreCustosOperacionaisPct: number | null;
};

/**
 * Simulação local — sem FIPE nem API.
 * Com `precoVendaEsperado` &gt; 0: market-minus (compra alvo dado venda e lucro % sobre investimento total).
 * Sem venda esperada: cost-plus (venda = custos × (1 + lucro %)).
 */
export function calcularSimulacaoBase(
  entradas: EntradasViabilidade
): ResultadoSimulacaoBase {
  const {
    reparos,
    transporte,
    documentacao,
    multasDebitosManual,
    outrosCustos,
    pctLucroDesejado,
    precoVendaEsperado,
  } = entradas;

  const multas = Number.isFinite(multasDebitosManual)
    ? Math.max(0, multasDebitosManual)
    : 0;
  const custoTotal =
    (Number.isFinite(reparos) ? reparos : 0) +
    (Number.isFinite(transporte) ? transporte : 0) +
    (Number.isFinite(documentacao) ? documentacao : 0) +
    multas +
    (Number.isFinite(outrosCustos) ? outrosCustos : 0);

  const pct = Number.isFinite(pctLucroDesejado) ? pctLucroDesejado : 0;
  const p = Math.max(0, pct);

  const esperado =
    Number.isFinite(precoVendaEsperado) && precoVendaEsperado > 0
      ? precoVendaEsperado
      : 0;

  if (esperado > 0) {
    const custosOperacionais = custoTotal;
    const divisor = 1 + p / 100;
    /** Meta de compra: venda / (1 + lucro%) − custos operacionais (sem preço de compra no custo total). */
    const precoCompraAlvoBruto = esperado / divisor - custosOperacionais;
    const precoCompraAlvo = arredondarReais2(Math.max(0, precoCompraAlvoBruto));
    const lucroEstimado = arredondarReais2(
      esperado - (precoCompraAlvo + custosOperacionais)
    );
    const margemSobreCustosOperacionaisPct =
      custoTotal > 0 ? (lucroEstimado / custoTotal) * 100 : null;

    return {
      custoTotal,
      precoVendaSugerido: esperado,
      modo: "market_minus",
      precoCompraAlvo,
      lucroEstimado,
      margemSobreCustosOperacionaisPct,
    };
  }

  const precoVendaSugerido = arredondarReais2(custoTotal * (1 + p / 100));
  const lucroEstimado = arredondarReais2(precoVendaSugerido - custoTotal);
  const margemSobreCustosOperacionaisPct =
    custoTotal > 0 ? (lucroEstimado / custoTotal) * 100 : null;

  return {
    custoTotal,
    precoVendaSugerido,
    modo: "cost_plus",
    precoCompraAlvo: null,
    lucroEstimado,
    margemSobreCustosOperacionaisPct,
  };
}

export type OpcoesCalcularViabilidade = {
  /**
   * Venda realista de mercado (FIPE × ajustes × risco). Quando omitida, usa-se a FIPE
   * ajustada só pelo % manual (sem impacto de histórico) para o teto — útil no servidor.
   */
  vendaRealistaReais?: number | null;
};

export function calcularViabilidade(
  entradas: EntradasViabilidade,
  fipeReferenciaTexto: string,
  opcoes?: OpcoesCalcularViabilidade
): ResultadoViabilidade {
  const sim = calcularSimulacaoBase(entradas);
  const { custoTotal, precoVendaSugerido } = sim;

  const fipeReferencia = parseValorBRL(fipeReferenciaTexto);
  let margemRealSobreFipePct: number | null = null;
  if (Number.isFinite(fipeReferencia) && fipeReferencia > 0) {
    margemRealSobreFipePct =
      ((precoVendaSugerido - fipeReferencia) / fipeReferencia) * 100;
  }

  const ajusteBruto = Number.isFinite(entradas.ajusteFipePct)
    ? entradas.ajusteFipePct
    : 0;
  const ajusteFipePct = Math.max(
    AJUSTE_FIPE_PCT_MIN,
    Math.min(AJUSTE_FIPE_PCT_MAX, ajusteBruto)
  );
  const fipeParaNegociacao =
    Number.isFinite(fipeReferencia) && fipeReferencia > 0
      ? arredondarReais2(fipeReferencia * (1 + ajusteFipePct / 100))
      : NaN;

  const vendaParaTeto =
    opcoes?.vendaRealistaReais != null &&
    Number.isFinite(opcoes.vendaRealistaReais) &&
    opcoes.vendaRealistaReais > 0
      ? opcoes.vendaRealistaReais
      : fipeParaNegociacao;

  const { ofertaMaximaSugerida, ofertaInicialAncoragem } =
    Number.isFinite(vendaParaTeto) && vendaParaTeto > 0
      ? calcularFaixaNegociacao(entradas, vendaParaTeto)
      : { ofertaMaximaSugerida: null, ofertaInicialAncoragem: null };

  const { lucroProjetado, margemRealProjecaoPct } =
    Number.isFinite(vendaParaTeto) && vendaParaTeto > 0
      ? calcularLucroEMargemProjecao(vendaParaTeto, entradas)
      : { lucroProjetado: 0, margemRealProjecaoPct: null };

  const veredito = vereditoPorMargemRealProjecao(margemRealProjecaoPct);

  return {
    custoTotal,
    precoVendaSugerido,
    margemRealSobreFipePct,
    margemRealProjecaoPct,
    lucroProjetadoMargem:
      margemRealProjecaoPct !== null ? lucroProjetado : null,
    veredito,
    ofertaMaximaSugerida,
    ofertaInicialAncoragem,
  };
}

/** % de impacto sobre a FIPE por tipo (ex.: −20 = −20%). Opcional no JSON legado. */
export type PercentuaisRiscoSimulacaoPersistidos = {
  percentualLeilao?: number;
  percentualSinistro?: number;
  percentualRoubo?: number;
  percentualGravame?: number;
};

export type SimulacaoViabilidadePersistida = EntradasViabilidade &
  ResultadoViabilidade &
  PercentuaisRiscoSimulacaoPersistidos & {
    atualizadoEm: string;
  };

/** Leitura do JSON salvo em `consultas_veiculos.simulacao_viabilidade`. */
export type LeituraSimulacaoViabilidadeJson = Partial<EntradasViabilidade> &
  Partial<PercentuaisRiscoSimulacaoPersistidos>;

export function simulacaoFromJSON(raw: unknown): LeituraSimulacaoViabilidadeJson | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const num = (k: string) => {
    const v = o[k];
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
  };
  return {
    /** Simulações antigas podem ter gravado `precoCompra`; leitura só para migração. */
    precoPedido: num("precoPedido") ?? num("precoCompra"),
    reparos: num("reparos"),
    transporte: num("transporte"),
    documentacao: num("documentacao"),
    outrosCustos: num("outrosCustos"),
    pctLucroDesejado: num("pctLucroDesejado"),
    pctGorduraNegociacao: num("pctGorduraNegociacao"),
    ajusteFipePct: num("ajusteFipePct"),
    precoVendaEsperado: num("precoVendaEsperado"),
    multasDebitosManual: num("multasDebitosManual"),
    percentualLeilao: num("percentualLeilao"),
    percentualSinistro: num("percentualSinistro"),
    percentualRoubo: num("percentualRoubo"),
    percentualGravame: num("percentualGravame"),
  };
}
