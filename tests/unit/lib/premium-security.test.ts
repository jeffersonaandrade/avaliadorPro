import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parsePlacaPadraoAntigoSequencia,
  registrarTentativaConsultaPremium,
  resetPremiumSecurityForTests,
  tresPlacasSaoSequenciaisEnum,
} from "@/lib/premium-security";

vi.mock("@/lib/demo-mocks", () => ({
  isPublicDemoMocksMode: () => false,
}));

describe("parsePlacaPadraoAntigoSequencia", () => {
  it("aceita AAA0001", () => {
    expect(parsePlacaPadraoAntigoSequencia("AAA0001")).toEqual({
      prefixo: "AAA",
      numero: 1,
    });
  });

  it("rejeita mercosul", () => {
    expect(parsePlacaPadraoAntigoSequencia("ABC1D23")).toBeNull();
  });
});

describe("tresPlacasSaoSequenciaisEnum", () => {
  it("true para AAA0001 AAA0002 AAA0003", () => {
    expect(
      tresPlacasSaoSequenciaisEnum("AAA0001", "AAA0002", "AAA0003")
    ).toBe(true);
  });

  it("false se prefixo diferente", () => {
    expect(
      tresPlacasSaoSequenciaisEnum("AAA0001", "AAB0002", "AAA0003")
    ).toBe(false);
  });
});

describe("registrarTentativaConsultaPremium", () => {
  afterEach(() => {
    resetPremiumSecurityForTests();
  });

  it("bloqueia o 6º request no mesmo minuto", () => {
    const t0 = Date.UTC(2026, 3, 10, 12, 0, 0);
    const uid = "user-rate";
    for (let i = 0; i < 5; i++) {
      const placaMercosul = `CD${i % 7}E2F${String(20 + i).padStart(2, "0")}`;
      expect(
        registrarTentativaConsultaPremium(uid, placaMercosul, t0 + i * 1000).ok
      ).toBe(true);
    }
    const sixth = registrarTentativaConsultaPremium(
      uid,
      "GH3I445",
      t0 + 5000
    );
    expect(sixth.ok).toBe(false);
    if (!sixth.ok) expect(sixth.codigo).toBe("rate");
  });

  it("cooldown após 21ª consulta na hora", () => {
    const base = Date.UTC(2026, 3, 10, 12, 0, 0);
    const uid = "user-hour";
    const stepMs = 13_000;
    for (let i = 0; i < 20; i++) {
      const placaMercosul = `AB${i % 9}C1D${String(10 + (i % 89)).padStart(2, "0")}`;
      expect(
        registrarTentativaConsultaPremium(uid, placaMercosul, base + i * stepMs).ok
      ).toBe(true);
    }
    const twentyFirst = registrarTentativaConsultaPremium(
      uid,
      "XY9Z876",
      base + 20 * stepMs
    );
    expect(twentyFirst.ok).toBe(false);
    if (!twentyFirst.ok) expect(twentyFirst.codigo).toBe("cooldown");
  });

  it("bloqueia enumeração AAA0001 AAA0002 AAA0003", () => {
    const t = Date.UTC(2026, 3, 10, 12, 0, 0);
    const uid = "user-seq";
    expect(registrarTentativaConsultaPremium(uid, "AAA0001", t).ok).toBe(true);
    expect(registrarTentativaConsultaPremium(uid, "AAA0002", t + 1000).ok).toBe(
      true
    );
    const third = registrarTentativaConsultaPremium(uid, "AAA0003", t + 2000);
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.codigo).toBe("enumeracao");
  });
});
