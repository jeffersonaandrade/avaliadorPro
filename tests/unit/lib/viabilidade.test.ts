import { describe, expect, it } from "vitest";
import {
  AJUSTE_FIPE_PCT_MAX,
  AJUSTE_FIPE_PCT_MIN,
  MAX_CENTAVOS_MOEDA,
  ajustarNegociacaoDescontoRenainf,
  arredondarReais2,
  calcularFaixaNegociacao,
  calcularLucroEMargemProjecao,
  calcularSimulacaoBase,
  calcularVeredito,
  calcularViabilidade,
  vereditoPorMargemRealProjecao,
  vereditoDadosCompletosParaSemaforo,
  centavosDeInputMoedaBr,
  formatarCentavosMoedaCampo,
  parseValorBRL,
  reaisDeInputMoedaBr,
  simulacaoFromJSON,
  type EntradasViabilidade,
} from "@/lib/viabilidade";

/** Valores monetários do motor devem coincidir com arredondamento a centavos. */
function assertMoedaArredondada2Casas(n: number) {
  expect(Number.isFinite(n)).toBe(true);
  expect(n).toBe(Math.round(n * 100) / 100);
}

function entradas(
  overrides: Partial<EntradasViabilidade> = {}
): EntradasViabilidade {
  return {
    precoPedido: 0,
    precoVendaEsperado: 0,
    reparos: 0,
    transporte: 0,
    documentacao: 0,
    multasDebitosManual: 0,
    outrosCustos: 0,
    pctLucroDesejado: 15,
    pctGorduraNegociacao: 10,
    ajusteFipePct: 0,
    ...overrides,
  };
}

describe("parseValorBRL", () => {
  it("parseia formato brasileiro com milhar", () => {
    expect(parseValorBRL("R$ 43.243,00")).toBe(43243);
  });

  it("retorna NaN para vazio ou traço", () => {
    expect(parseValorBRL("")).toBeNaN();
    expect(parseValorBRL("—")).toBeNaN();
    expect(parseValorBRL("   ")).toBeNaN();
  });
});

describe("centavosDeInputMoedaBr / reaisDeInputMoedaBr", () => {
  it("interpreta apenas dígitos como centavos", () => {
    expect(centavosDeInputMoedaBr("1")).toBe(1);
    expect(reaisDeInputMoedaBr("1")).toBe(0.01);
    expect(reaisDeInputMoedaBr("30000")).toBe(300);
  });

  it("respeita teto de centavos", () => {
    expect(centavosDeInputMoedaBr("9".repeat(20))).toBe(MAX_CENTAVOS_MOEDA);
  });
});

describe("formatarCentavosMoedaCampo", () => {
  it("retorna vazio para zero ou inválido", () => {
    expect(formatarCentavosMoedaCampo(0)).toBe("");
    expect(formatarCentavosMoedaCampo(-1)).toBe("");
  });

  it("formata centavos em pt-BR", () => {
    const s = formatarCentavosMoedaCampo(12_345_678);
    expect(s).toMatch(/123\.456,78/);
  });
});

describe("calcularSimulacaoBase", () => {
  it("cost-plus: venda = custo × (1 + lucro%)", () => {
    const r = calcularSimulacaoBase(
      entradas({
        reparos: 1000,
        pctLucroDesejado: 15,
        precoVendaEsperado: 0,
      })
    );
    expect(r.modo).toBe("cost_plus");
    expect(r.custoTotal).toBe(1000);
    expect(r.precoVendaSugerido).toBe(1150);
    expect(r.lucroEstimado).toBe(150);
    expect(r.margemSobreCustosOperacionaisPct).toBe(15);
    expect(r.precoCompraAlvo).toBeNull();
  });

  it("market-minus: compra alvo e lucro coerentes", () => {
    const r = calcularSimulacaoBase(
      entradas({
        reparos: 5000,
        transporte: 0,
        documentacao: 0,
        outrosCustos: 0,
        pctLucroDesejado: 15,
        precoVendaEsperado: 50_000,
      })
    );
    expect(r.modo).toBe("market_minus");
    expect(r.custoTotal).toBe(5000);
    expect(r.precoVendaSugerido).toBe(50_000);
    expect(r.precoCompraAlvo).toBe(38478.26);
    expect(r.lucroEstimado).toBe(6521.74);
  });

  it("trata lucro negativo como zero", () => {
    const r = calcularSimulacaoBase(
      entradas({ reparos: 100, pctLucroDesejado: -5 })
    );
    expect(r.precoVendaSugerido).toBe(100);
  });

  it("custo zero em market-minus: margem null", () => {
    const r = calcularSimulacaoBase(
      entradas({
        precoVendaEsperado: 10_000,
        pctLucroDesejado: 10,
      })
    );
    expect(r.margemSobreCustosOperacionaisPct).toBeNull();
  });
});

describe("calcularFaixaNegociacao", () => {
  it("retorna null se venda realista inválida", () => {
    const r = calcularFaixaNegociacao(entradas(), NaN);
    expect(r.ofertaMaximaSugerida).toBeNull();
    expect(r.ofertaInicialAncoragem).toBeNull();
  });

  it("lucro 0%: oferta máxima = FIPE − custos fixos", () => {
    const r = calcularFaixaNegociacao(
      entradas({
        pctLucroDesejado: 0,
        reparos: 10_000,
        pctGorduraNegociacao: 0,
      }),
      100_000
    );
    expect(r.ofertaMaximaSugerida).toBe(90_000);
    expect(r.ofertaInicialAncoragem).toBe(90_000);
  });

  it("gordura 10% reduz oferta inicial", () => {
    const r = calcularFaixaNegociacao(
      entradas({
        pctLucroDesejado: 0,
        reparos: 0,
        pctGorduraNegociacao: 10,
      }),
      100_000
    );
    expect(r.ofertaMaximaSugerida).toBe(100_000);
    expect(r.ofertaInicialAncoragem).toBe(90_000);
  });

  it("lucro 15% encolhe o teto de compra", () => {
    const r = calcularFaixaNegociacao(
      entradas({ pctLucroDesejado: 15, reparos: 0 }),
      115_000
    );
    expect(r.ofertaMaximaSugerida).toBe(100_000);
  });
});

describe("ajustarNegociacaoDescontoRenainf", () => {
  it("subtrai multas do teto e mantém proporção da oferta inicial", () => {
    const r = ajustarNegociacaoDescontoRenainf(100_000, 90_000, 10_000);
    expect(r.ofertaMaximaSugerida).toBe(90_000);
    expect(r.ofertaInicialAncoragem).toBe(81_000);
  });

  it("não altera quando desconto é zero ou inválido", () => {
    const r = ajustarNegociacaoDescontoRenainf(50_000, 45_000, 0);
    expect(r.ofertaMaximaSugerida).toBe(50_000);
    expect(r.ofertaInicialAncoragem).toBe(45_000);
  });

  it("teto não fica negativo", () => {
    const r = ajustarNegociacaoDescontoRenainf(5_000, 4_000, 20_000);
    expect(r.ofertaMaximaSugerida).toBe(0);
    expect(r.ofertaInicialAncoragem).toBe(0);
  });
});

describe("vereditoPorMargemRealProjecao", () => {
  it("arriscado abaixo de 5% ou prejuízo", () => {
    expect(vereditoPorMargemRealProjecao(4.9)).toBe("arriscado");
    expect(vereditoPorMargemRealProjecao(-2)).toBe("arriscado");
  });

  it("atenção entre 5% e 15%", () => {
    expect(vereditoPorMargemRealProjecao(5)).toBe("atencao");
    expect(vereditoPorMargemRealProjecao(15)).toBe("atencao");
  });

  it("viável acima de 15%", () => {
    expect(vereditoPorMargemRealProjecao(15.01)).toBe("viavel");
  });

  it("indefinido sem margem", () => {
    expect(vereditoPorMargemRealProjecao(null)).toBe("indefinido");
  });
});

describe("vereditoDadosCompletosParaSemaforo", () => {
  it("false sem contexto FIPE na decisão", () => {
    expect(
      vereditoDadosCompletosParaSemaforo(entradas({ precoPedido: 50_000 }), {
        contextoFipeMercadoAtivo: false,
        vendaRealistaReais: 80_000,
      })
    ).toBe(false);
  });

  it("false sem venda realista válida", () => {
    expect(
      vereditoDadosCompletosParaSemaforo(entradas({ precoPedido: 50_000 }), {
        contextoFipeMercadoAtivo: true,
        vendaRealistaReais: 0,
      })
    ).toBe(false);
  });

  it("false sem preço de compra informado", () => {
    expect(
      vereditoDadosCompletosParaSemaforo(
        entradas({
          precoPedido: 0,
          reparos: 1,
          transporte: 1,
          documentacao: 1,
          multasDebitosManual: 0,
          outrosCustos: 0,
        }),
        { contextoFipeMercadoAtivo: true, vendaRealistaReais: 90_000 }
      )
    ).toBe(false);
  });

  it("true com compra, custos finitos e venda realista", () => {
    expect(
      vereditoDadosCompletosParaSemaforo(
        entradas({
          precoPedido: 40_000,
          reparos: 2_000,
          transporte: 500,
          documentacao: 300,
          multasDebitosManual: 0,
          outrosCustos: 0,
        }),
        { contextoFipeMercadoAtivo: true, vendaRealistaReais: 85_000 }
      )
    ).toBe(true);
  });
});

describe("calcularLucroEMargemProjecao", () => {
  it("margem = lucro / (compra + reparos + documentação)", () => {
    const { lucroProjetado, margemRealProjecaoPct } = calcularLucroEMargemProjecao(
      100_000,
      entradas({
        precoPedido: 50_000,
        reparos: 10_000,
        documentacao: 5_000,
        multasDebitosManual: 0,
        transporte: 0,
        outrosCustos: 0,
      })
    );
    expect(lucroProjetado).toBe(35_000);
    expect(margemRealProjecaoPct).toBe(53.85);
  });
});

describe("calcularVeredito", () => {
  it("indefinido sem FIPE válida", () => {
    expect(calcularVeredito(0, 1000, 5000)).toBe("indefinido");
    expect(calcularVeredito(NaN, 1000, 5000)).toBe("indefinido");
  });

  it("arriscado quando custo ≥ 82% da FIPE", () => {
    expect(calcularVeredito(100, 82, 50)).toBe("arriscado");
  });

  it("arriscado quando venda sugerida > FIPE", () => {
    expect(calcularVeredito(100, 10, 101)).toBe("arriscado");
  });

  it("viável quando venda ≤ 90% da FIPE e custo folgado", () => {
    expect(calcularVeredito(100, 50, 85)).toBe("viavel");
  });

  it("atenção entre 90% e 100% da FIPE", () => {
    expect(calcularVeredito(100, 50, 95)).toBe("atencao");
  });

  it("exatamente 90% da FIPE é viável", () => {
    expect(calcularVeredito(100, 50, 90)).toBe("viavel");
  });

  it("prioriza arrisco de custo antes de venda", () => {
    expect(calcularVeredito(100, 90, 200)).toBe("arriscado");
  });
});

describe("calcularViabilidade", () => {
  const fipeStr = "R$ 100.000,00";

  it("integra simulação, margem % e ofertas", () => {
    const r = calcularViabilidade(
      entradas({
        reparos: 5000,
        pctLucroDesejado: 0,
        pctGorduraNegociacao: 10,
        precoVendaEsperado: 0,
      }),
      fipeStr
    );
    expect(r.custoTotal).toBe(5000);
    expect(r.precoVendaSugerido).toBe(5000);
    expect(r.margemRealSobreFipePct).toBeCloseTo(-95, 5);
    expect(r.ofertaMaximaSugerida).toBe(95_000);
    expect(r.ofertaInicialAncoragem).toBe(85_500);
    expect(r.margemRealProjecaoPct).not.toBeNull();
    expect(r.veredito).toBe("viavel");
  });

  it("teto segue venda realista informada (não só FIPE ajustada)", () => {
    const r = calcularViabilidade(
      entradas({
        reparos: 5_000,
        pctLucroDesejado: 0,
        pctGorduraNegociacao: 10,
      }),
      "R$ 100.000,00",
      { vendaRealistaReais: 90_000 }
    );
    expect(r.ofertaMaximaSugerida).toBe(85_000);
  });

  it("multas manuais reduzem o teto", () => {
    const sem = calcularViabilidade(
      entradas({ reparos: 0, pctLucroDesejado: 0, multasDebitosManual: 0 }),
      "R$ 50.000,00"
    );
    const com = calcularViabilidade(
      entradas({ reparos: 0, pctLucroDesejado: 0, multasDebitosManual: 3_000 }),
      "R$ 50.000,00"
    );
    expect(com.ofertaMaximaSugerida).toBe((sem.ofertaMaximaSugerida ?? 0) - 3_000);
  });

  it("FIPE inválida: sem oferta nem margem", () => {
    const r = calcularViabilidade(entradas(), "—");
    expect(r.margemRealSobreFipePct).toBeNull();
    expect(r.ofertaMaximaSugerida).toBeNull();
    expect(r.veredito).toBe("indefinido");
  });

  it("clamp de ajuste FIPE extremo", () => {
    const base = calcularViabilidade(
      entradas({ reparos: 0, pctLucroDesejado: 0 }),
      fipeStr
    );
    const mais200 = calcularViabilidade(
      entradas({ reparos: 0, pctLucroDesejado: 0, ajusteFipePct: 200 }),
      fipeStr
    );
    const menos200 = calcularViabilidade(
      entradas({ reparos: 0, pctLucroDesejado: 0, ajusteFipePct: -200 }),
      fipeStr
    );
    expect(mais200.ofertaMaximaSugerida).toBe(200_000);
    expect(menos200.ofertaMaximaSugerida).toBeNull();
    expect(base.ofertaMaximaSugerida).toBe(100_000);
  });

  it("ajuste -10% reduz referência de negociação", () => {
    const r = calcularViabilidade(
      entradas({ reparos: 0, pctLucroDesejado: 0 }),
      fipeStr
    );
    const ajustado = calcularViabilidade(
      entradas({ reparos: 0, pctLucroDesejado: 0, ajusteFipePct: -10 }),
      fipeStr
    );
    expect(ajustado.ofertaMaximaSugerida).toBe(90_000);
    expect(r.ofertaMaximaSugerida).toBe(100_000);
  });
});

describe("simulacaoFromJSON", () => {
  it("null para entrada inválida", () => {
    expect(simulacaoFromJSON(null)).toBeNull();
    expect(simulacaoFromJSON("x")).toBeNull();
  });

  it("lê precoCompra como precoPedido (migração)", () => {
    const p = simulacaoFromJSON({ precoCompra: 12_500 });
    expect(p?.precoPedido).toBe(12_500);
  });

  it("prioriza precoPedido sobre precoCompra", () => {
    const p = simulacaoFromJSON({
      precoPedido: 1,
      precoCompra: 2,
    });
    expect(p?.precoPedido).toBe(1);
  });
});

describe("constantes de ajuste FIPE", () => {
  it("expõe limites esperados", () => {
    expect(AJUSTE_FIPE_PCT_MIN).toBe(-100);
    expect(AJUSTE_FIPE_PCT_MAX).toBe(100);
  });
});

describe("arredondarReais2", () => {
  it("elimina dízimas em divisões problemáticas", () => {
    expect(arredondarReais2(10 / 3)).toBe(3.33);
    expect(arredondarReais2(0.1 + 0.2)).toBe(0.3);
  });
});

describe("precisão e clamps do motor (ponto flutuante)", () => {
  it("market-minus: precoCompraAlvo nunca é negativo quando custos > venda líquida", () => {
    const r = calcularSimulacaoBase(
      entradas({
        reparos: 5000,
        precoVendaEsperado: 1000,
        pctLucroDesejado: 15,
      })
    );
    expect(r.precoCompraAlvo).toBe(0);
    expect(r.precoCompraAlvo).toBeGreaterThanOrEqual(0);
    assertMoedaArredondada2Casas(r.precoCompraAlvo!);
    assertMoedaArredondada2Casas(r.lucroEstimado!);
  });

  it("saídas monetárias de calcularSimulacaoBase com no máximo 2 casas decimais", () => {
    const r = calcularSimulacaoBase(
      entradas({
        reparos: 1234.56,
        transporte: 78.9,
        pctLucroDesejado: 17,
        precoVendaEsperado: 0,
      })
    );
    assertMoedaArredondada2Casas(r.custoTotal);
    assertMoedaArredondada2Casas(r.precoVendaSugerido);
    assertMoedaArredondada2Casas(r.lucroEstimado!);
  });

  it("calcularViabilidade: ofertas e custo sem centavos ‘fantasma’", () => {
    const r = calcularViabilidade(
      entradas({
        reparos: 3333.33,
        pctLucroDesejado: 15,
        pctGorduraNegociacao: 7,
      }),
      "R$ 88.888,88"
    );
    assertMoedaArredondada2Casas(r.custoTotal);
    assertMoedaArredondada2Casas(r.precoVendaSugerido);
    expect(r.ofertaMaximaSugerida).not.toBeNull();
    assertMoedaArredondada2Casas(r.ofertaMaximaSugerida!);
    assertMoedaArredondada2Casas(r.ofertaInicialAncoragem!);
  });

  it("calcularFaixaNegociacao: resultado alinhado a centavos", () => {
    const { ofertaMaximaSugerida, ofertaInicialAncoragem } =
      calcularFaixaNegociacao(
        entradas({ pctLucroDesejado: 12.345, reparos: 111.11 }),
        77_777.77
      );
    assertMoedaArredondada2Casas(ofertaMaximaSugerida!);
    assertMoedaArredondada2Casas(ofertaInicialAncoragem!);
  });
});
