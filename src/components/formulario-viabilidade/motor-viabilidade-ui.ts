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
    titulo: "Compra viável",
    subtitulo:
      "Preço de venda sugerido está pelo menos 10% abaixo da FIPE, com folga de custo.",
  },
  arriscado: {
    titulo: "Compra arriscada",
    subtitulo:
      "Custos operacionais muito próximos da FIPE ou venda sugerida acima do mercado de referência.",
  },
  atencao: {
    titulo: "Atenção ao preço",
    subtitulo:
      "Revise margem: a venda sugerida não atinge 10% abaixo da FIPE com folga confortável.",
  },
  indefinido: {
    titulo: "Veredito indisponível",
    subtitulo: "Sem valor FIPE válido para comparar o cenário.",
  },
};
