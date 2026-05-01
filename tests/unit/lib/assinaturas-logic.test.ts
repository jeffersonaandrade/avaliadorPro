import { describe, expect, it } from "vitest";

import { clampConsultasFipePosDowngrade } from "@/lib/assinaturas-plan-clamp";

describe("clampConsultasFipePosDowngrade (downgrade FIPE)", () => {
  it("mantém utilizadas quando abaixo do novo limite", () => {
    expect(clampConsultasFipePosDowngrade(25, 30)).toBe(25);
  });

  it("limita ao novo teto quando utilizadas > limite (Premium→PRO)", () => {
    expect(clampConsultasFipePosDowngrade(40, 30)).toBe(30);
  });

  it("zera resultado inválido", () => {
    expect(clampConsultasFipePosDowngrade(-5, 10)).toBe(0);
    expect(clampConsultasFipePosDowngrade(10, -1)).toBe(0);
  });
});
