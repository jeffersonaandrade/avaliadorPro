import type { TipoConsultaRiscoPremium } from "@/lib/consultas-risco-premium";

export const DEBOUNCE_MS = 700;
export const PCT_PADRAO = 15;
/** Acima disso, exibimos aviso educativo (não bloqueia o valor). */
export const LUCRO_ELEVADO_LIMITE_PCT = 20;

/** Comparação venda esperada × FIPE da consulta (só alerta de contexto). */
export const DESVIO_VENDA_ACIMA_FIPE = 0.2;
export const DESVIO_VENDA_ABAIXO_FIPE = -0.3;

/** Mock até integração com gateway PIX. */
export const PIX_CHAVE_MOCK = "000.000.000-00";

export const CONSULTAS_RISCO_PREMIUM_UI: {
  tipo: TipoConsultaRiscoPremium;
  titulo: string;
  precoLabel: string;
}[] = [
  { tipo: "leilao", titulo: "Leilão", precoLabel: "R$ 3,90" },
  { tipo: "sinistro", titulo: "Sinistro", precoLabel: "R$ 3,90" },
  { tipo: "roubo_furto", titulo: "Roubo / furto", precoLabel: "R$ 2,90" },
  { tipo: "gravame", titulo: "Gravame", precoLabel: "R$ 2,90" },
];
