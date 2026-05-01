import { describe, expect, it } from "vitest";

import { calcularPrecoExcedente } from "@/lib/planos-marketing";

describe("calcularPrecoExcedente", () => {
  it("retorna 1,49 para starter e aliases", () => {
    expect(calcularPrecoExcedente("starter")).toBe(1.49);
    expect(calcularPrecoExcedente("STARTER")).toBe(1.49);
    expect(calcularPrecoExcedente("basico")).toBe(1.49);
    expect(calcularPrecoExcedente("")).toBe(1.49);
  });

  it("retorna 1,29 para pro", () => {
    expect(calcularPrecoExcedente("pro")).toBe(1.29);
    expect(calcularPrecoExcedente("PRO")).toBe(1.29);
  });

  it("retorna 0,99 para premium", () => {
    expect(calcularPrecoExcedente("premium")).toBe(0.99);
  });

  it("plano desconhecido cai em starter (margem segura)", () => {
    expect(calcularPrecoExcedente("inexistente")).toBe(1.49);
    expect(calcularPrecoExcedente(null)).toBe(1.49);
  });
});
