import { describe, expect, it } from "vitest";

import {
  consultasFipeRestantes,
  podeConsumirFipe,
  podeUsarConsultaFipe,
  type FipeCotaGateSnapshot,
} from "@/lib/fipe-cota-calculo";
import { limitesPlanoPorSlug } from "@/lib/planos-marketing";

function row(p: Partial<FipeCotaGateSnapshot>): FipeCotaGateSnapshot {
  return {
    plano_ativo: true,
    consultas_fipe_utilizadas: 0,
    consultas_fipe_limite: 10,
    ...p,
  };
}

describe("limitesPlanoPorSlug (pricing sustentável)", () => {
  it("expõe cotas do bundle por slug", () => {
    expect(limitesPlanoPorSlug("starter")).toEqual({
      consultasFipeLimite: 10,
      creditosPremium: 0,
    });
    expect(limitesPlanoPorSlug("pro")).toEqual({
      consultasFipeLimite: 30,
      creditosPremium: 1,
    });
    expect(limitesPlanoPorSlug("premium")).toEqual({
      consultasFipeLimite: 60,
      creditosPremium: 3,
    });
  });
});

describe("consultasFipeRestantes / podeUsarConsultaFipe / podeConsumirFipe", () => {
  it("com 100% da cota, restantes = 0 e não pode usar", () => {
    const u = row({ consultas_fipe_utilizadas: 10, consultas_fipe_limite: 10 });
    expect(consultasFipeRestantes(u)).toBe(0);
    expect(podeUsarConsultaFipe(u)).toBe(false);
    expect(podeConsumirFipe(u)).toBe(false);
  });

  it("abaixo do limite, pode usar e restantes corretos", () => {
    const u = row({ consultas_fipe_utilizadas: 9, consultas_fipe_limite: 10 });
    expect(consultasFipeRestantes(u)).toBe(1);
    expect(podeUsarConsultaFipe(u)).toBe(true);
    expect(podeConsumirFipe(u)).toBe(true);
  });

  it("plano inativo não permite uso", () => {
    const u = row({
      plano_ativo: false,
      consultas_fipe_utilizadas: 0,
      consultas_fipe_limite: 10,
    });
    expect(consultasFipeRestantes(u)).toBe(0);
    expect(podeUsarConsultaFipe(u)).toBe(false);
    expect(podeConsumirFipe(u)).toBe(false);
  });

  it("limite zero bloqueia", () => {
    const u = row({ consultas_fipe_limite: 0, consultas_fipe_utilizadas: 0 });
    expect(podeUsarConsultaFipe(u)).toBe(false);
    expect(podeConsumirFipe(u)).toBe(false);
    expect(consultasFipeRestantes(u)).toBe(0);
  });
});
