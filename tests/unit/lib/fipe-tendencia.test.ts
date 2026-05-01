import { describe, expect, it } from "vitest";

import { analisarTendenciaFipe, gerarInsightFipe } from "@/lib/fipe-tendencia";

describe("analisarTendenciaFipe", () => {
  it("detecta tendencia de queda", () => {
    const r = analisarTendenciaFipe({
      "2024_05": "45989.00",
      "2025_04": "43208.00",
    });
    expect(r?.tendencia).toBe("caindo");
    expect(r?.variacaoReais).toBe(-2781);
    expect(r?.variacaoPercentual).toBeCloseTo(-6.05, 2);
  });

  it("detecta tendencia de alta", () => {
    const r = analisarTendenciaFipe({
      "2024_05": "40000.00",
      "2025_04": "43000.00",
    });
    expect(r?.tendencia).toBe("subindo");
    expect(r?.variacaoReais).toBe(3000);
    expect(r?.variacaoPercentual).toBe(7.5);
  });

  it("detecta tendencia estavel", () => {
    const r = analisarTendenciaFipe({
      "2024_05": "40000.00",
      "2025_04": "41000.00",
    });
    expect(r?.tendencia).toBe("estavel");
    expect(r?.variacaoPercentual).toBe(2.5);
  });

  it("retorna null para historico vazio", () => {
    expect(analisarTendenciaFipe({})).toBeNull();
    expect(analisarTendenciaFipe(null)).toBeNull();
  });

  it("retorna null para valores invalidos", () => {
    expect(
      analisarTendenciaFipe({
        "2024_05": "abc",
        "2025_04": "43000.00",
      })
    ).toBeNull();
  });
});

describe("gerarInsightFipe", () => {
  it("gera textos por tendencia", () => {
    expect(gerarInsightFipe("caindo", -6)).toContain("desvalorizacao");
    expect(gerarInsightFipe("subindo", 4)).toContain("valorizacao");
    expect(gerarInsightFipe("estavel", 0)).toContain("Preco estavel");
  });
});

