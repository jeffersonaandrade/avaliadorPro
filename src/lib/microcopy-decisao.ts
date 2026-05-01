export type EstadoDecisao = "verde" | "amarelo" | "vermelho" | "incompleto";

export interface MicrocopyDecisao {
  titulo: string;
  subtitulo: string;
  impacto?: string;
  risco?: string;
  liquidez?: string;
  recomendacao: string;
}

function fmtMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export function obterMicrocopyDecisao(
  estado: EstadoDecisao,
  valorPerda?: number,
  riscos?: string[]
): MicrocopyDecisao {
  if (estado === "vermelho") {
    return {
      titulo: "🔴 NAO COMPRE",
      subtitulo: "Alto risco de prejuizo neste veiculo",
      impacto:
        Number.isFinite(valorPerda) && (valorPerda ?? 0) > 0
          ? `Voce pode perder ate R$ ${fmtMoeda(valorPerda!)}`
          : undefined,
      risco: riscos?.length ? `Risco: ${riscos.join(" • ")}` : undefined,
      liquidez: "⚠️ Pode ficar parado no patio",
      recomendacao: "Evite essa compra, exceto com desconto muito agressivo.",
    };
  }

  if (estado === "amarelo") {
    return {
      titulo: "🟡 COMPRE SO COM DESCONTO",
      subtitulo: "Existe oportunidade, mas o preco precisa cair.",
      impacto:
        Number.isFinite(valorPerda) && (valorPerda ?? 0) > 0
          ? `Margem de risco: R$ ${fmtMoeda(valorPerda!)}`
          : undefined,
      risco: riscos?.length ? `Risco: ${riscos.join(" • ")}` : undefined,
      liquidez: "⚠️ Giro pode ser mais lento no patio.",
      recomendacao:
        "Entre somente se conseguir comprar abaixo do preco maximo seguro.",
    };
  }

  if (estado === "verde") {
    return {
      titulo: "🟢 BOA COMPRA",
      subtitulo: "Margem e risco estao sob controle",
      impacto:
        Number.isFinite(valorPerda) && (valorPerda ?? 0) > 0
          ? `Risco controlado: R$ ${fmtMoeda(valorPerda!)}`
          : undefined,
      liquidez: "✔️ Boa liquidez de mercado",
      recomendacao: "Pode avancar, mas nao ultrapasse o preco maximo seguro.",
    };
  }

  return {
    titulo: "⚪ ANALISE INCOMPLETA",
    subtitulo: "Riscos ocultos ainda nao verificados",
    impacto: "Voce pode estar assumindo prejuizo sem saber",
    recomendacao: "Valide o historico para tomar uma decisao segura",
  };
}

