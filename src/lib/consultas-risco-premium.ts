/** Mesmas chaves de `FATORES_RISCO` na UI (evita dependência circular com o componente). */
type ChaveFatorMercado =
  | "leilao"
  | "sinistro"
  | "roubo"
  | "gravame"
  | "renainf";

export const TIPOS_CONSULTA_RISCO_PREMIUM = [
  "leilao",
  "sinistro",
  "roubo_furto",
  "gravame",
  "renainf",
] as const;

export type TipoConsultaRiscoPremium =
  (typeof TIPOS_CONSULTA_RISCO_PREMIUM)[number];

/** Alinhado a `TTL_PREMIUM_DIAS` no backend (consultas premium válidas). */
const TTL_PREMIUM_CONSULTA_MS = 7 * 86_400_000;

/**
 * Indica se o registro premium deste tipo existe e ainda está dentro do TTL
 * (evita nova chamada à API quando o cache em `consultas_veiculos` é válido).
 */
export function consultaPremiumTipoFrescaNoBloco(
  block: Record<string, unknown>,
  tipo: TipoConsultaRiscoPremium
): boolean {
  const ex = block[tipo];
  if (!ex || typeof ex !== "object" || Array.isArray(ex)) return false;
  const o = ex as Record<string, unknown>;
  const em =
    typeof o.consultado_em === "string"
      ? o.consultado_em
      : typeof o.consultadoEm === "string"
        ? o.consultadoEm
        : "";
  if (!em.trim()) return false;
  const t = Date.parse(em);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < TTL_PREMIUM_CONSULTA_MS;
}

export type ResultadoConsultaRiscoCarregado = {
  consultadoEm: string;
  constatado: boolean;
  resumo: string;
};

export type RiscosCarregadosMap = Partial<
  Record<TipoConsultaRiscoPremium, ResultadoConsultaRiscoCarregado>
>;

/**
 * API Consultar Placa v2: `possui_registro` / `possui_gravame` vêm como
 * `"sim" | "nao" | "indisponivel"` (e variantes com acento).
 */
export type TriPossuiRegistroConsultaPlaca =
  | "sim"
  | "nao"
  | "indisponivel"
  | "desconhecido";

export function triPossuiRegistroConsultaPlaca(
  v: unknown
): TriPossuiRegistroConsultaPlaca {
  if (typeof v !== "string") return "desconhecido";
  const t = v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (t === "sim") return "sim";
  if (t === "nao") return "nao";
  if (t === "indisponivel") return "indisponivel";
  return "desconhecido";
}

/** Apenas `"sim"` conta como risco constatado para veredito/UI. */
export function constatadoTriStateConsultaPlaca(v: unknown): boolean {
  return triPossuiRegistroConsultaPlaca(v) === "sim";
}

/** Liga tipo de consulta paga ao fator de ajuste de FIPE na UI. */
export const MAP_PREMIUM_PARA_FATOR: Record<
  TipoConsultaRiscoPremium,
  ChaveFatorMercado
> = {
  leilao: "leilao",
  sinistro: "sinistro",
  roubo_furto: "roubo",
  gravame: "gravame",
  renainf: "renainf",
};

export function mergeFlagsComConsultasPremium(
  flagsDoHistoricoBase: Record<ChaveFatorMercado, boolean>,
  riscosCarregados: RiscosCarregadosMap
): Record<ChaveFatorMercado, boolean> {
  const out: Record<ChaveFatorMercado, boolean> = { ...flagsDoHistoricoBase };
  for (const tipo of TIPOS_CONSULTA_RISCO_PREMIUM) {
    const r = riscosCarregados[tipo];
    if (!r) continue;
    const fator = MAP_PREMIUM_PARA_FATOR[tipo];
    out[fator] = r.constatado;
  }
  return out;
}

/** Remove `consultas_premium` para não duplicar flags ao varrer o JSON. */
export function dadosLeilaoSemConsultasPremium(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = { ...(raw as Record<string, unknown>) };
  delete o.consultas_premium;
  return o;
}

/** Riscos premium exibidos como já “consultados” na sandbox (sem esperar API). */
export function criarRiscosPremiumSimuladosExibicao(
  consultadoEmIso?: string
): RiscosCarregadosMap {
  const consultadoEm =
    consultadoEmIso ?? new Date().toISOString();
  return {
    leilao: {
      consultadoEm,
      constatado: false,
      resumo: "Leilão: Não (simulação).",
    },
    sinistro: {
      consultadoEm,
      constatado: true,
      resumo: "Sinistro: Sim (simulação).",
    },
    roubo_furto: {
      consultadoEm,
      constatado: false,
      resumo: "Roubo/furto: Não (simulação).",
    },
    gravame: {
      consultadoEm,
      constatado: false,
      resumo: "Gravame: Não (simulação).",
    },
    renainf: {
      consultadoEm,
      constatado: false,
      resumo: "Renainf: Não (simulação).",
    },
  };
}

/**
 * Blindagem completa com cache válido (todos os tipos premium dentro do TTL).
 * Fora do TTL, o lojista precisa rodar nova blindagem (novo crédito) para dados atualizados.
 */
export function blindagemCompletaJaAtiva(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const root = raw as Record<string, unknown>;
  const prevPremium = root.consultas_premium;
  const block =
    prevPremium && typeof prevPremium === "object" && !Array.isArray(prevPremium)
      ? (prevPremium as Record<string, unknown>)
      : {};
  return TIPOS_CONSULTA_RISCO_PREMIUM.every((tipo) =>
    consultaPremiumTipoFrescaNoBloco(block, tipo)
  );
}

export function extrairRiscosCarregadosDeDadosLeilao(
  raw: unknown
): RiscosCarregadosMap {
  const out: RiscosCarregadosMap = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const root = raw as Record<string, unknown>;
  const block = root.consultas_premium;
  if (!block || typeof block !== "object" || Array.isArray(block)) return out;
  for (const tipo of TIPOS_CONSULTA_RISCO_PREMIUM) {
    const item = (block as Record<string, unknown>)[tipo];
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    if (!consultaPremiumTipoFrescaNoBloco(block as Record<string, unknown>, tipo)) {
      continue;
    }
    const o = item as Record<string, unknown>;
    const consultadoEm =
      typeof o.consultado_em === "string"
        ? o.consultado_em
        : typeof o.consultadoEm === "string"
          ? o.consultadoEm
          : "";
    if (!consultadoEm) continue;
    const constatado =
      o.constatado === true ||
      (typeof o.constatado === "string" &&
        constatadoTriStateConsultaPlaca(o.constatado));
    const resumo =
      typeof o.resumo === "string" && o.resumo.trim()
        ? o.resumo.trim()
        : constatado
          ? "Indício positivo na consulta."
          : "Nada constatado nesta consulta.";
    out[tipo] = { consultadoEm, constatado, resumo };
  }
  return out;
}
