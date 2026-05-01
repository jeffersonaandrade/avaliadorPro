export type EstadoCopyBlindagem =
  | "sem_blindagem_com_credito"
  | "sem_blindagem_sem_credito"
  | "blindagem_com_risco"
  | "blindagem_limpo";

export type CopyBlindagem = {
  estado: EstadoCopyBlindagem;
  titulo: string;
  subtitulo: string;
  impacto: string;
  bullets: string[];
  cta: string;
};

export function obterCopyBlindagem(input: {
  blindagemAtiva: boolean;
  temCredito: boolean;
  temRiscoEstrutural: boolean;
}): CopyBlindagem {
  const { blindagemAtiva, temCredito, temRiscoEstrutural } = input;

  if (!blindagemAtiva && temCredito) {
    return {
      estado: "sem_blindagem_com_credito",
      titulo: "⚠️ Você ainda não sabe o risco real deste carro",
      subtitulo: "FIPE não mostra histórico de leilão, sinistro ou roubo",
      impacto: "Você pode estar comprando um prejuízo sem saber",
      bullets: [
        "Descubra se existe histórico oculto",
        "Evite pagar preço de carro limpo",
        "Use o resultado para negociar melhor",
      ],
      cta: "🛡️ Proteger negociação (1 crédito)",
    };
  }

  if (!blindagemAtiva && !temCredito) {
    return {
      estado: "sem_blindagem_sem_credito",
      titulo: "⚠️ Histórico não validado",
      subtitulo: "Adicione créditos para desbloquear análise completa",
      impacto: "Sem blindagem, você assume todo o risco",
      bullets: [],
      cta: "Comprar créditos",
    };
  }

  if (temRiscoEstrutural) {
    return {
      estado: "blindagem_com_risco",
      titulo: "🚨 Risco confirmado",
      subtitulo: "Esse carro possui histórico que impacta o valor",
      impacto: "Agora você sabe quanto pode perder",
      bullets: [],
      cta: "Usar isso na negociação",
    };
  }

  return {
    estado: "blindagem_limpo",
    titulo: "✅ Histórico validado",
    subtitulo: "Nenhum risco estrutural encontrado",
    impacto: "Decisão muito mais segura",
    bullets: [],
    cta: "Seguir com negociação",
  };
}

