const FIPE_BASE = "https://api.fipe.online/fipe/api/v1";

export type TipoFipePath = "carros" | "motos" | "caminhoes";

export type MarcaFipe = { codigo: string; nome: string };
export type ModeloFipe = { codigo: number; nome: string };
export type AnoFipe = { codigo: string; nome: string };

export type ResultadoFipe = {
  valor: string;
  mesReferencia: string;
  modeloFipeNome: string;
  combustivelFipe: string;
};

function normalizeText(s: string): string {
  /** Preserva literais tipo 1.0 / 1,6 para bater com a FIPE (ponto não virar espaço). */
  const comDecimais = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b\d+[.,]\d+\b/g, (m) => m.replace(",", "."));
  return comDecimais
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokens(s: string): string[] {
  return normalizeText(s)
    .split(" ")
    .filter((t) => t.length > 1);
}

/** Expansões de abreviações comuns em placas/DETRAN (antes da normalização agressiva). */
function expandirAbreviacoesModelo(raw: string): string {
  let s = raw;
  const reemplazos: [RegExp, string][] = [
    [/\bCOMFOR\b/gi, "Comfort"],
    [/\bCONFORTO?\b/gi, "Comfort"],
    [/\bCOMF\.\b/gi, "Comfort"],
    [/\bAUT\.\b/gi, "Aut"],
    [/\bMEC\.\b/gi, "Mec"],
    /** "1.0M" colado (sem espaço) não casa com \b...\s*M — tratar M colado ao número. */
    [/(\d+\.\d+)M\b/gi, "$1"],
    [/\b(\d+\.\d+)\s*M\b/gi, "$1"],
    [/\b(\d+)\s*M\b/gi, "$1"],
  ];
  for (const [re, rep] of reemplazos) {
    s = s.replace(re, rep);
  }
  return s;
}

/**
 * Remove marca no início e padrão "MARCA/" (só texto bruto — não normaliza,
 * para não perder "1.0" antes de expandir abreviações).
 */
export function removerMarcaDoModelo(modeloPlaca: string, marca: string): string {
  let s = modeloPlaca.trim();
  const mTrim = marca.trim();
  if (!mTrim) return s;

  const esc = mTrim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  s = s.replace(new RegExp(`^${esc}\\s*/\\s*`, "i"), "");
  s = s.replace(new RegExp(`^${esc}\\s+`, "i"), "");
  s = s.replace(new RegExp(`^${esc}$`, "i"), "");

  const marcaNorm = normalizeText(mTrim);
  let n = s.trim();
  for (const t of marcaNorm.split(" ").filter((x) => x.length > 1)) {
    const re = new RegExp(`^${t}\\s+`, "i");
    n = n.replace(re, "").trim();
  }
  return n;
}

/**
 * Tokens significativos preservando versões tipo "1.0" (não viram "1" e "0" separados).
 */
export function extrairTokensReferenciaModelo(
  modeloPlaca: string,
  marcaPlaca: string
): string[] {
  const semMarca = expandirAbreviacoesModelo(
    removerMarcaDoModelo(modeloPlaca, marcaPlaca)
  );
  const n = semMarca
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const found = n.match(/[a-z]{2,}|\d+(?:\.\d+)?/g) ?? [];
  const stop = new Set(["de", "da", "do", "com", "e", "ou", "flex"]);
  return [...new Set(found.filter((t) => !stop.has(t)))];
}

/** Referência em texto único normalizado (legado + score híbrido). */
export function limparModeloReferencia(
  modeloPlaca: string,
  marca: string
): string {
  const sem = removerMarcaDoModelo(modeloPlaca, marca);
  return normalizeText(expandirAbreviacoesModelo(sem));
}

function tipoVeiculoParaPath(tipo: string): TipoFipePath {
  const n = normalizeText(tipo);
  if (
    n.includes("moto") ||
    n.includes("ciclomotor") ||
    n.includes("motocicleta")
  ) {
    return "motos";
  }
  if (
    n.includes("caminhao") ||
    n.includes("caminhão") ||
    n.includes("onibus") ||
    n.includes("ônibus") ||
    (n.includes("utilitario") && n.includes("carga"))
  ) {
    return "caminhoes";
  }
  return "carros";
}

async function fipeGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${FIPE_BASE}${path}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`FipeAPI HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function tokenCasaEmTextoFipe(t: string, f: string): boolean {
  if (t.length < 2) return false;
  if (/^\d+(?:\.\d+)?$/.test(t)) {
    return f.includes(t) || f.includes(t.replace(".", ","));
  }
  /** Tokens com dígito (ex.: hb20): \b evita hb20 dentro de hb20s */
  if (/[0-9]/.test(t)) {
    return new RegExp(`\\b${escapeRegExp(t)}\\b`, "i").test(f);
  }
  if (new RegExp(`\\b${escapeRegExp(t)}\\b`, "i").test(f)) return true;
  /** Abreviação na FIPE: comf → comfort (só letras, sem confundir hb20 com hb20s) */
  if (/^[a-z]+$/.test(t) && t.length >= 4) {
    for (const w of f.split(" ")) {
      if (w.length < 3) continue;
      if (
        (w.startsWith(t) && w.length > t.length) ||
        (t.startsWith(w) && t.length > w.length)
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Pontuação por sobreposição de tokens da referência no nome FIPE. */
function scoreIntersecaoTokens(nomeFipe: string, refTokens: string[]): number {
  if (refTokens.length === 0) return 0;
  const f = normalizeText(nomeFipe);
  let hits = 0;
  let peso = 0;
  for (const tok of refTokens) {
    const t = tok.toLowerCase();
    if (!tokenCasaEmTextoFipe(t, f)) continue;
    hits++;
    if (/^\d+(?:\.\d+)?$/.test(t)) {
      peso += 8;
    } else {
      peso += Math.min(t.length + 4, 14);
    }
  }
  if (hits === refTokens.length) return 80 + peso;
  if (hits >= 2 && refTokens.length >= 2) return 45 + peso * 0.7;
  if (hits >= 1 && refTokens.length === 1) return 40 + peso;
  return peso * 0.5;
}

/** Pontuação de similaridade entre nome FIPE e referência da placa. */
function scoreModelo(nomeFipe: string, referenciaNormalizada: string): number {
  const f = normalizeText(nomeFipe);
  const ref = referenciaNormalizada;
  if (!ref.length) return 0;
  let score = 0;
  const refTokens = tokens(ref);
  const fTokens = new Set(tokens(nomeFipe));
  for (const t of refTokens) {
    if (t.length < 2) continue;
    if (tokenCasaEmTextoFipe(t, f)) score += Math.min(t.length, 8);
    if (fTokens.has(t)) score += 4;
  }
  const nums = ref.match(/\d+(?:[.,]\d+)?/g) ?? [];
  for (const n of nums) {
    const compact = n.replace(",", ".");
    if (f.includes(compact) || f.includes(n.replace(".", ","))) score += 5;
  }
  if (f.includes(ref) && ref.length > 4) score += 12;
  return score;
}

export function encontrarMarcaCodigo(
  marcas: MarcaFipe[],
  marcaPlaca: string
): string | null {
  const m = normalizeText(marcaPlaca);
  if (!m) return null;

  const extras: [string, string[]][] = [
    ["vw", ["vw", "volks", "volkswagen", "v w"]],
    ["gm", ["chevrolet", "chevy", "gm"]],
    ["mercedes", ["mercedes", "benz"]],
  ];

  let best: { codigo: string; score: number } | null = null;
  for (const row of marcas) {
    const nome = normalizeText(row.nome);
    let s = 0;
    if (m === nome) s = 100;
    else if (nome.includes(m) || m.includes(nome)) s = 60;
    else {
      const nt = tokens(marcaPlaca);
      for (const t of nt) {
        if (t.length > 2 && nome.includes(t)) s += 20;
      }
    }
    for (const [needle, aliases] of extras) {
      if (m.includes(needle)) {
        for (const a of aliases) {
          if (nome.includes(a)) s += 25;
        }
      }
    }
    if (!best || s > best.score) best = { codigo: row.codigo, score: s };
  }
  if (!best || best.score < 15) return null;
  return best.codigo;
}

const SCORE_MIN_MODELO = 12;
const MAX_MODELOS_TENTAR_COM_ANO = 35;

/** Evita confundir hatch (HB20) com sedã (HB20S) quando a placa indica só um deles. */
function penalidadeFamiliaHb20(modeloPlaca: string, marcaPlaca: string, nomeFipe: string): number {
  const ref = normalizeText(
    expandirAbreviacoesModelo(removerMarcaDoModelo(modeloPlaca, marcaPlaca))
  );
  const f = normalizeText(nomeFipe);
  const refSedan = /\bhb20s\b/.test(ref);
  const refHatch = /\bhb20\b/.test(ref) && !refSedan;
  const fipeSedan = /\bhb20s\b/.test(f);
  const fipeHatch = /\bhb20\b/.test(f) && !fipeSedan;
  if (refHatch && fipeSedan) return -120;
  if (refSedan && fipeHatch) return -120;
  return 0;
}

/** Ranqueados do melhor para o pior (para tentar outro modelo se o ano não existir na FIPE). */
export function ranquearModelosPorPlaca(
  modelos: ModeloFipe[],
  modeloPlaca: string,
  marcaPlaca: string
): { modelo: ModeloFipe; score: number }[] {
  const ref = limparModeloReferencia(modeloPlaca, marcaPlaca);
  const refTokens = extrairTokensReferenciaModelo(modeloPlaca, marcaPlaca);

  const scored: { modelo: ModeloFipe; score: number }[] = [];
  for (const m of modelos) {
    const scBase = scoreModelo(m.nome, ref);
    const scInt = scoreIntersecaoTokens(m.nome, refTokens);
    let sc = Math.max(scBase, scInt) + penalidadeFamiliaHb20(modeloPlaca, marcaPlaca, m.nome);
    if (sc < 0) sc = 0;
    if (sc >= SCORE_MIN_MODELO) scored.push({ modelo: m, score: sc });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function encontrarMelhorModelo(
  modelos: ModeloFipe[],
  modeloPlaca: string,
  marcaPlaca: string
): ModeloFipe | null {
  const ranked = ranquearModelosPorPlaca(modelos, modeloPlaca, marcaPlaca);
  return ranked[0]?.modelo ?? null;
}

/**
 * Álcool/Gasolina na placa: priorizar Gasolina (-1) e depois Flex (-5), conforme tabela FIPE.
 */
function suffixCombustivelPreferido(combustivelPlaca: string): string[] {
  const c = normalizeText(combustivelPlaca);
  if (c.includes("flex")) {
    return ["5", "1", "2", "3", "4", "6"];
  }
  if (c.includes("alcool") && c.includes("gasolina")) {
    return ["1", "5", "2", "3", "4", "6"];
  }
  if (c.includes("diesel")) return ["3", "5", "1"];
  if (c.includes("eletric")) return ["4", "5", "1"];
  if (c.includes("hibrid") || c.includes("híbrid"))
    return ["6", "5", "1"];
  if (c.includes("gasolina")) return ["1", "5", "2"];
  if (c.includes("alcool")) return ["2", "5", "1"];
  return ["5", "1", "2", "3", "4", "6"];
}

export function escolherCodigoAno(
  anos: AnoFipe[],
  anoModelo: number,
  combustivelPlaca: string
): string | null {
  const same = anos.filter((a) => {
    const y = parseInt(a.codigo.split("-")[0] ?? "", 10);
    return y === anoModelo;
  });
  if (same.length === 0) return null;
  const prefs = suffixCombustivelPreferido(combustivelPlaca);
  for (const suf of prefs) {
    const hit = same.find((a) => a.codigo.endsWith(`-${suf}`));
    if (hit) return hit.codigo;
  }
  return same[0]?.codigo ?? null;
}

type VeiculoFipeDetalhe = {
  Valor: string;
  MesReferencia: string;
  Modelo: string;
  Combustivel: string;
};

/**
 * Resolve preço FIPE (API pública Parallelum). Retorna null se não houver match seguro.
 */
export async function resolverPrecoFipe(input: {
  marca: string;
  modelo: string;
  anoModelo: number;
  combustivel: string;
  tipoVeiculo: string;
}): Promise<ResultadoFipe | null> {
  const pathTipo = tipoVeiculoParaPath(input.tipoVeiculo);
  const marcas = await fipeGet<MarcaFipe[]>(`/${pathTipo}/marcas`);
  const codMarca = encontrarMarcaCodigo(marcas, input.marca);
  if (!codMarca) return null;

  const modelosRes = await fipeGet<{ modelos: ModeloFipe[] }>(
    `/${pathTipo}/marcas/${codMarca}/modelos`
  );
  const modelos = modelosRes.modelos ?? [];
  const candidatos = ranquearModelosPorPlaca(
    modelos,
    input.modelo,
    input.marca
  ).slice(0, MAX_MODELOS_TENTAR_COM_ANO);
  if (candidatos.length === 0) return null;

  for (const { modelo } of candidatos) {
    const anos = await fipeGet<AnoFipe[]>(
      `/${pathTipo}/marcas/${codMarca}/modelos/${modelo.codigo}/anos`
    );
    const codAno = escolherCodigoAno(anos, input.anoModelo, input.combustivel);
    if (!codAno) continue;

    const detalhe = await fipeGet<VeiculoFipeDetalhe>(
      `/${pathTipo}/marcas/${codMarca}/modelos/${modelo.codigo}/anos/${encodeURIComponent(codAno)}`
    );

    if (!detalhe?.Valor || !detalhe?.MesReferencia) continue;

    return {
      valor: detalhe.Valor,
      mesReferencia: detalhe.MesReferencia,
      modeloFipeNome: detalhe.Modelo,
      combustivelFipe: detalhe.Combustivel,
    };
  }

  return null;
}
