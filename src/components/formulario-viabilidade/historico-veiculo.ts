import { constatadoTriStateConsultaPlaca } from "@/lib/consultas-risco-premium";

/** Camada de mercado (UI): fatores sobre a FIPE tabela quando o histórico indica risco. */
export const FATORES_RISCO = {
  leilao: -0.2,
  sinistro: -0.15,
  roubo: -0.1,
  gravame: -0.05,
} as const;

export type ChaveFatorRisco = keyof typeof FATORES_RISCO;

/** Sinônimos normalizados (sem acento) para casar chaves vindas de `dados_leilao` / API. */
const SINONIMOS_FATOR: Record<ChaveFatorRisco, string[]> = {
  leilao: [
    "leilao",
    "passagem_leilao",
    "em_leilao",
    "auction",
    "historico_leilao",
  ],
  sinistro: [
    "sinistro",
    "perda_total",
    "perdatotal",
    "sinistro_grave",
    "colisao",
    "avaria",
  ],
  roubo: ["roubo", "furto", "roubo_furto", "furtado"],
  gravame: [
    "gravame",
    "alienacao",
    "alienacao_fiduciaria",
    "restricao_financeira",
    "restricao",
  ],
};

function normChaveHistorico(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

const CONJUNTOS_CHAVE_FATOR: Record<ChaveFatorRisco, Set<string>> = {
  leilao: new Set(SINONIMOS_FATOR.leilao.map(normChaveHistorico)),
  sinistro: new Set(SINONIMOS_FATOR.sinistro.map(normChaveHistorico)),
  roubo: new Set(SINONIMOS_FATOR.roubo.map(normChaveHistorico)),
  gravame: new Set(SINONIMOS_FATOR.gravame.map(normChaveHistorico)),
};

/** Caminhos normalizados da API Consultar Placa v2 (para `possui_registro` / `possui_gravame`). */
const PATH_API_LEILAO = normChaveHistorico("informacoes_sobre_leilao");
const PATH_API_SINISTRO = normChaveHistorico("registro_sinistro_com_perda_total");
const PATH_API_ROUBO = normChaveHistorico("registros_roubo_furto");
const PATH_API_GRAVAME = normChaveHistorico("gravame");
const KEY_POSSUI_REGISTRO = normChaveHistorico("possui_registro");
const KEY_POSSUI_GRAVAME = normChaveHistorico("possui_gravame");

function normValorHistoricoString(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function valorHistoricoAtivo(v: unknown): boolean {
  if (v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const t = normValorHistoricoString(v);
    if (!t) return false;
    if (
      [
        "n",
        "nao",
        "false",
        "0",
        "na",
        "nao consta",
        "indisponivel",
      ].includes(t)
    ) {
      return false;
    }
    if (["s", "sim", "true", "1", "yes"].includes(t)) return true;
    return false;
  }
  return false;
}

export function extrairFlagsHistoricoVeiculo(
  root: unknown
): Record<ChaveFatorRisco, boolean> {
  const flags: Record<ChaveFatorRisco, boolean> = {
    leilao: false,
    sinistro: false,
    roubo: false,
    gravame: false,
  };

  function visit(node: unknown, depth: number, pathNorm: string[]) {
    if (depth > 10 || node === null || node === undefined) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1, pathNorm);
      return;
    }
    if (typeof node !== "object") return;

    for (const [k, v] of Object.entries(node)) {
      const kn = normChaveHistorico(k);
      (Object.keys(FATORES_RISCO) as ChaveFatorRisco[]).forEach((fator) => {
        if (CONJUNTOS_CHAVE_FATOR[fator].has(kn) && valorHistoricoAtivo(v)) {
          flags[fator] = true;
        }
      });

      if (
        kn === KEY_POSSUI_REGISTRO &&
        (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      ) {
        if (constatadoTriStateConsultaPlaca(v)) {
          if (pathNorm.includes(PATH_API_LEILAO)) flags.leilao = true;
          if (pathNorm.includes(PATH_API_SINISTRO)) flags.sinistro = true;
          if (pathNorm.includes(PATH_API_ROUBO)) flags.roubo = true;
        }
      }
      if (
        kn === KEY_POSSUI_GRAVAME &&
        (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      ) {
        if (
          constatadoTriStateConsultaPlaca(v) &&
          pathNorm.includes(PATH_API_GRAVAME)
        ) {
          flags.gravame = true;
        }
      }

      if (typeof v === "object" && v !== null) {
        visit(v, depth + 1, [...pathNorm, kn]);
      }
    }
  }

  visit(root, 0, []);
  return flags;
}
