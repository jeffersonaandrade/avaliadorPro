import { describe, expect, it } from "vitest";

import { simularMargemUsuario } from "@/lib/simulador-margem";

describe("simularMargemUsuario", () => {
  it("uso dentro do plano (PRO): sem excedente nem créditos avulsos", () => {
    const r = simularMargemUsuario({
      plano: "pro",
      fipe_utilizadas: 15,
      creditos_utilizados: 0,
      creditos_comprados: 0,
    });
    expect(r.detalhamento.receita_assinatura).toBe(99.9);
    expect(r.detalhamento.receita_excedente).toBe(0);
    expect(r.detalhamento.receita_creditos).toBe(0);
    expect(r.detalhamento.custo_fipe).toBe(15.6);
    expect(r.detalhamento.custo_creditos).toBe(0);
    expect(r.receita).toBe(99.9);
    expect(r.custo).toBe(15.6);
    expect(r.lucro).toBe(84.3);
    expect(r.margem_percentual).toBe(84.38);
  });

  it("uso no limite da cota FIPE (PREMIUM)", () => {
    const r = simularMargemUsuario({
      plano: "premium",
      fipe_utilizadas: 60,
      creditos_utilizados: 2,
      creditos_comprados: 0,
    });
    expect(r.detalhamento.receita_excedente).toBe(0);
    expect(r.detalhamento.custo_fipe).toBe(62.4);
    expect(r.detalhamento.custo_creditos).toBe(52.64);
    expect(r.custo).toBe(115.04);
    expect(r.receita).toBe(189.9);
    expect(r.lucro).toBe(74.86);
  });

  it("excedente FIPE alto (PRO)", () => {
    const r = simularMargemUsuario({
      plano: "pro",
      fipe_utilizadas: 50,
      creditos_utilizados: 0,
      creditos_comprados: 0,
    });
    const excedente = 50 - 30;
    expect(r.detalhamento.receita_excedente).toBe(roundExpect(excedente * 1.29));
    expect(r.receita).toBe(
      roundExpect(99.9 + excedente * 1.29)
    );
    expect(r.detalhamento.custo_fipe).toBe(52);
  });

  it("receita com créditos avulsos vendidos", () => {
    const r = simularMargemUsuario({
      plano: "starter",
      fipe_utilizadas: 3,
      creditos_utilizados: 1,
      creditos_comprados: 2,
    });
    expect(r.detalhamento.receita_creditos).toBe(79.8);
    expect(r.receita).toBe(roundExpect(39.9 + 79.8));
    expect(r.detalhamento.custo_creditos).toBe(26.32);
  });

  it("cenário com lucro negativo (custos acima da receita) — matemática explícita", () => {
    const r = simularMargemUsuario({
      plano: "starter",
      fipe_utilizadas: 5,
      creditos_utilizados: 4,
      creditos_comprados: 0,
    });
    expect(r.receita).toBe(39.9);
    expect(r.custo).toBe(roundExpect(5 * 1.04 + 4 * 26.32));
    expect(r.lucro).toBeLessThan(0);
    expect(r.margem_percentual).toBeLessThan(0);
  });

  it("entradas negativas ou NaN tratadas como zero", () => {
    const r = simularMargemUsuario({
      plano: "pro",
      fipe_utilizadas: -10,
      creditos_utilizados: NaN,
      creditos_comprados: -1,
    });
    expect(r.detalhamento.custo_fipe).toBe(0);
    expect(r.detalhamento.custo_creditos).toBe(0);
    expect(r.detalhamento.receita_excedente).toBe(0);
  });
});

function roundExpect(n: number): number {
  return Math.round(n * 100) / 100;
}
