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

/** Itens exibidos após blindagem (sem preço avulso — 1 crédito cobre o pacote completo). */
export const BLINDAGEM_TIPOS_UI: { tipo: TipoConsultaRiscoPremium; titulo: string }[] = [
  { tipo: "leilao", titulo: "Leilão" },
  { tipo: "sinistro", titulo: "Sinistro" },
  { tipo: "roubo_furto", titulo: "Roubo / furto" },
  { tipo: "gravame", titulo: "Gravame" },
  { tipo: "renainf", titulo: "Infrações (RENAINF)" },
];
