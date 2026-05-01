import { describe, expect, it } from "vitest";

import { formatarMoedaBRLExibicao } from "@/lib/formato-moeda-exibicao";

describe("formatarMoedaBRLExibicao", () => {
  it("sempre exibe 2 casas decimais (pt-BR)", () => {
    expect(formatarMoedaBRLExibicao(12972.9)).toMatch(/,\d{2}$/);
    expect(formatarMoedaBRLExibicao(12972.9)).toContain("12.972,90");
  });

  it("NaN retorna traço", () => {
    expect(formatarMoedaBRLExibicao(Number.NaN)).toBe("—");
  });
});
