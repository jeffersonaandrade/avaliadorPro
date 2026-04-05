import {
  calcularSimulacaoBase,
  type EntradasViabilidade,
  type ResultadoViabilidade,
  type VereditoViabilidade,
} from "@/lib/viabilidade";

export function inferirFipeMercadoAtivoNoHistorico(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  const om = o.ofertaMaximaSugerida;
  return typeof om === "number" && Number.isFinite(om) && om >= 0;
}

export function resultadoSemContextoFipeMercado(
  entradas: EntradasViabilidade
): ResultadoViabilidade {
  const sim = calcularSimulacaoBase(entradas);
  return {
    custoTotal: sim.custoTotal,
    precoVendaSugerido: sim.precoVendaSugerido,
    margemRealSobreFipePct: null,
    margemRealProjecaoPct: null,
    lucroProjetadoMargem: null,
    veredito: "indefinido",
    ofertaMaximaSugerida: null,
    ofertaInicialAncoragem: null,
  };
}

export const rotulosVeredito: Record<
  VereditoViabilidade,
  { titulo: string; subtitulo: string }
> = {
  viavel: {
    titulo: "Excelente negócio",
    subtitulo: "Margem de lucro segura.",
  },
  arriscado: {
    titulo: "Não recomendado",
    subtitulo: "Margem de segurança insuficiente.",
  },
  atencao: {
    titulo: "Viável com ressalvas",
    subtitulo: "Negocie o valor de compra para melhorar a margem.",
  },
  indefinido: {
    titulo: "Veredito indisponível",
    subtitulo:
      "Informe preço de compra, reparos, transporte, documentação, multas e outros custos (e a referência de mercado) para calcular a margem e o semáforo.",
  },
};
