import { describe, expect, it } from "vitest";
import { calcularValorEvitarPerdaReais } from "@/lib/valor-evitar-perda";

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

  it("reflete desconto agregado FIPE × |impacto| com leilão (-20%)", () => {
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
});
