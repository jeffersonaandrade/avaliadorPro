/** Mesmas chaves de `FATORES_RISCO` na UI (evita dependência circular com o componente). */
type ChaveFatorMercado = "leilao" | "sinistro" | "roubo" | "gravame";

export const TIPOS_CONSULTA_RISCO_PREMIUM = [
  "leilao",
  "sinistro",
  "roubo_furto",
  "gravame",
] as const;

export type TipoConsultaRiscoPremium =
  (typeof TIPOS_CONSULTA_RISCO_PREMIUM)[number];

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
 * Apenas `"sim"` deve contar como risco constatado para veredito/UI.
 */
export function constatadoTriStateConsultaPlaca(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const t = v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return t === "sim";
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
  };
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
