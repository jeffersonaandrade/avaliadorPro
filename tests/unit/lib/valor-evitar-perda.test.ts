import { describe, expect, it } from "vitest";
import {
  calcularValorEvitarPerdaReais,
  decimalDePercentualSalvoOuPadrao,
  impactoRiscoAgregado,
  resolverDecimaisImpactoDeSimulacao,
} from "@/lib/valor-evitar-perda";
import { FATORES_RISCO } from "@/components/formulario-viabilidade/historico-veiculo";

describe("decimalDePercentualSalvoOuPadrao", () => {
  it("usa fallback quando ausente", () => {
    expect(decimalDePercentualSalvoOuPadrao(undefined, -0.2)).toBe(-0.2);
    expect(decimalDePercentualSalvoOuPadrao("x", -0.15)).toBe(-0.15);
  });

  it("converte % salvo e aplica clamp UI", () => {
    expect(decimalDePercentualSalvoOuPadrao(-20, -0.99)).toBe(-0.2);
    expect(decimalDePercentualSalvoOuPadrao(-150, -0.2)).toBe(-1);
    expect(decimalDePercentualSalvoOuPadrao(5, -0.2)).toBe(0);
  });
});

describe("resolverDecimaisImpactoDeSimulacao", () => {
  it("fallback total quando JSON sem campos", () => {
    const d = resolverDecimaisImpactoDeSimulacao(null);
    expect(d.leilao).toBe(FATORES_RISCO.leilao);
    expect(d.sinistro).toBe(FATORES_RISCO.sinistro);
    expect(d.roubo).toBe(FATORES_RISCO.roubo);
    expect(d.gravame).toBe(FATORES_RISCO.gravame);
  });

  it("prioriza percentuais persistidos", () => {
    const d = resolverDecimaisImpactoDeSimulacao({
      percentualLeilao: -30,
      percentualSinistro: -10,
    });
    expect(d.leilao).toBe(-0.3);
    expect(d.sinistro).toBe(-0.1);
    expect(d.roubo).toBe(FATORES_RISCO.roubo);
  });
});

describe("calcularValorEvitarPerdaReais", () => {
  it("retorna null sem FIPE válida", () => {
    expect(
      calcularValorEvitarPerdaReais({
        fipeTexto: "—",
        dadosLeilao: {},
        simulacaoViabilidade: null,
      })
    ).toBeNull();
  });

  it("zero quando não há indícios de risco", () => {
    const v = calcularValorEvitarPerdaReais({
      fipeTexto: "R$ 100.000,00",
      dadosLeilao: { consultas_premium: {} },
      simulacaoViabilidade: { ajusteFipePct: 0 },
    });
    expect(v).toBe(0);
  });

  it("reflete desconto agregado com leilão e padrão −20%", () => {
    const iso = new Date().toISOString();
    const v = calcularValorEvitarPerdaReais({
      fipeTexto: "R$ 100.000,00",
      dadosLeilao: {
        consultas_premium: {
          leilao: {
            consultado_em: iso,
            constatado: true,
            resumo: "x",
          },
        },
      },
      simulacaoViabilidade: { ajusteFipePct: 0 },
    });
    expect(v).toBe(20_000);
  });

  it("percentual personalizado altera o ROI (determinístico)", () => {
    const iso = new Date().toISOString();
    const base = {
      fipeTexto: "R$ 100.000,00",
      dadosLeilao: {
        consultas_premium: {
          leilao: {
            consultado_em: iso,
            constatado: true,
            resumo: "x",
          },
        },
      },
      simulacaoViabilidade: { ajusteFipePct: 0, percentualLeilao: -25 },
    };
    const a = calcularValorEvitarPerdaReais(base);
    const b = calcularValorEvitarPerdaReais(base);
    expect(a).toBe(25_000);
    expect(b).toBe(a);
  });

  it("valor exibido alinha com impacto agregado (mesma simulação)", () => {
    const iso = new Date().toISOString();
    const sim = {
      ajusteFipePct: 0,
      percentualLeilao: -20,
      percentualSinistro: -15,
    };
    const flags = {
      leilao: true,
      sinistro: true,
      roubo: false,
      gravame: false,
      renainf: false,
    };
    const dec = resolverDecimaisImpactoDeSimulacao(sim);
    const { comTeto } = impactoRiscoAgregado(flags, dec);
    const fipe = 100_000;
    const esperado = Math.max(
      0,
      Math.round(fipe * -comTeto * 100) / 100
    );
    const v = calcularValorEvitarPerdaReais({
      fipeTexto: "R$ 100.000,00",
      dadosLeilao: {
        consultas_premium: {
          leilao: { consultado_em: iso, constatado: true, resumo: "a" },
          sinistro: { consultado_em: iso, constatado: true, resumo: "b" },
        },
      },
      simulacaoViabilidade: sim,
    });
    expect(v).toBe(esperado);
  });

  it("nunca retorna negativo (clamp)", () => {
    const v = calcularValorEvitarPerdaReais({
      fipeTexto: "R$ 50.000,00",
      dadosLeilao: {},
      simulacaoViabilidade: { ajusteFipePct: 0 },
    });
    expect(v).toBe(0);
    expect(v !== null && v >= 0).toBe(true);
  });
});
