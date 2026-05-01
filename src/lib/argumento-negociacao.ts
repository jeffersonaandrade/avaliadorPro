import type { EstadoDecisao } from "@/lib/microcopy-decisao";

export type ArgumentoNegociacaoInput = {
  estado: EstadoDecisao;
  precoMaximoSeguro?: number | null;
  faixaInicialMin?: number | null;
  faixaInicialMax?: number | null;
  valorEvitarPerda?: number | null;
  riscosResumo?: string[];
};

export type ArgumentoNegociacao = {
  titulo: string;
  textoCurto: string;
  mensagemCopiavel: string;
};

function fmtMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function gerarArgumentoNegociacao(
  input: ArgumentoNegociacaoInput
): ArgumentoNegociacao {
  const estado = input.estado;
  const tetoOk =
    input.precoMaximoSeguro !== null &&
    input.precoMaximoSeguro !== undefined &&
    Number.isFinite(input.precoMaximoSeguro) &&
    input.precoMaximoSeguro > 0;
  const minOk =
    input.faixaInicialMin !== null &&
    input.faixaInicialMin !== undefined &&
    Number.isFinite(input.faixaInicialMin) &&
    input.faixaInicialMin > 0;
  const maxOk =
    input.faixaInicialMax !== null &&
    input.faixaInicialMax !== undefined &&
    Number.isFinite(input.faixaInicialMax) &&
    input.faixaInicialMax > 0;

  if (estado === "vermelho") {
    const tetoTxt = tetoOk ? fmtMoeda(input.precoMaximoSeguro!) : "um valor seguro";
    return {
      titulo: "Use isso para baixar forte o preço",
      textoCurto:
        "Esse carro só faz sentido com desconto agressivo. Acima do preço máximo seguro, o risco de prejuízo é alto.",
      mensagemCopiavel: `Pelo histórico identificado e pelo risco de revenda, consigo pagar no máximo ${tetoTxt}. Acima disso, o negócio não fecha para mim.`,
    };
  }

  if (estado === "amarelo") {
    if (minOk && maxOk) {
      return {
        titulo: "Negocie com margem de segurança",
        textoCurto:
          "Existe oportunidade, mas só se o preço ficar dentro da faixa segura.",
        mensagemCopiavel: `Consigo avançar se fecharmos entre ${fmtMoeda(input.faixaInicialMin!)} e ${fmtMoeda(input.faixaInicialMax!)}. Acima disso, minha margem fica comprometida.`,
      };
    }
    const tetoTxt = tetoOk ? fmtMoeda(input.precoMaximoSeguro!) : "um valor seguro";
    return {
      titulo: "Negocie com margem de segurança",
      textoCurto: "Existe oportunidade, mas só com desconto real no fechamento.",
      mensagemCopiavel: `Consigo avançar se fecharmos abaixo de ${tetoTxt}. Acima disso, minha margem fica comprometida.`,
    };
  }

  if (estado === "verde") {
    const tetoTxt = tetoOk ? fmtMoeda(input.precoMaximoSeguro!) : "um teto seguro";
    return {
      titulo: "Boa oportunidade, mas não ultrapasse o teto",
      textoCurto: "Mesmo sendo uma boa compra, mantenha disciplina no preço.",
      mensagemCopiavel: `Tenho interesse no carro, mas para manter a margem segura consigo chegar até ${tetoTxt}.`,
    };
  }

  return {
    titulo: "Não negocie no escuro",
    textoCurto:
      "Antes de fechar preço, valide o histórico para evitar prejuízo oculto.",
    mensagemCopiavel:
      "Antes de fechar, preciso validar histórico de leilão, sinistro, roubo/furto e gravame para definir uma proposta segura.",
  };
}

