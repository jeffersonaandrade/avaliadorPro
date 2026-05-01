export type ConteudoSeoDistribuicao = {
  titulo: string;
  url: string;
  fipeExemplo?: string;
  precoExemplo?: string;
  valorRealExemplo?: string;
  prejuizoExemplo?: string;
};

export type PostSocialDistribuicao = {
  linkedin: string;
  twitter: string;
  reddit: string;
};

export function gerarPostSocial(
  conteudoSEO: ConteudoSeoDistribuicao
): PostSocialDistribuicao {
  const fipe = conteudoSEO.fipeExemplo ?? "R$ 42k";
  const preco = conteudoSEO.precoExemplo ?? "R$ 38k";
  const valorReal = conteudoSEO.valorRealExemplo ?? "R$ 32k";
  const prejuizo = conteudoSEO.prejuizoExemplo ?? "R$ 6k";

  return {
    linkedin: `Hoje quase fechei um carro que parecia ótimo.

FIPE: ${fipe}
Preço pedido: ${preco}

Parecia oportunidade.
Mas o histórico derrubava o valor real para ${valorReal}.

Resultado: prejuízo potencial de ${prejuizo}.

Se você trabalha com revenda, não compre no escuro.
${conteudoSEO.titulo}: ${conteudoSEO.url}`,
    twitter: `Quase comprei um carro "barato".
FIPE ${fipe} | pedido ${preco}
Com histórico, valor real caiu para ${valorReal}.
Prejuízo potencial: ${prejuizo}.

Não é sobre preço baixo.
É sobre margem protegida.
${conteudoSEO.url}`,
    reddit: `Hoje quase comprei um carro que parecia perfeito.

FIPE: ${fipe}
Preço: ${preco}

Parecia oportunidade.
Mas tinha histórico que derrubava o valor real para ${valorReal}.
Ou seja: prejuízo potencial de ${prejuizo}.

Foi aí que eu percebi: comprar sem validar histórico é roleta russa.

Montei esse conteúdo com o passo a passo:
${conteudoSEO.titulo}
${conteudoSEO.url}`,
  };
}

export function gerarPostsSociaisEmLote(
  conteudos: ConteudoSeoDistribuicao[],
  limite = 10
): PostSocialDistribuicao[] {
  return conteudos.slice(0, Math.max(0, limite)).map(gerarPostSocial);
}

