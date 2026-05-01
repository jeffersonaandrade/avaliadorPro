import { describe, expect, it } from "vitest";
import { labelPlanoFromSlug, PLANOS_LANDING } from "@/lib/planos-marketing";

describe("planos-marketing", () => {
  it("expõe três planos com slugs e preços", () => {
    expect(PLANOS_LANDING).toHaveLength(3);
    expect(PLANOS_LANDING.map((p) => p.slug)).toEqual([
      "starter",
      "pro",
      "premium",
    ]);
    expect(PLANOS_LANDING.find((p) => p.slug === "starter")?.fipeMes).toBe(10);
    expect(PLANOS_LANDING.find((p) => p.slug === "pro")?.fipeMes).toBe(30);
    expect(PLANOS_LANDING.find((p) => p.slug === "premium")?.fipeMes).toBe(60);
    expect(PLANOS_LANDING.find((p) => p.slug === "pro")?.creditosRisco).toBe(1);
    expect(PLANOS_LANDING.find((p) => p.slug === "premium")?.creditosRisco).toBe(
      3
    );
    expect(PLANOS_LANDING.find((p) => p.slug === "pro")?.destaque).toBe(true);
  });

  it("labelPlanoFromSlug resolve slug e alias basico", () => {
    expect(labelPlanoFromSlug("starter")).toBe("STARTER");
    expect(labelPlanoFromSlug("basico")).toBe("STARTER");
    expect(labelPlanoFromSlug("PRO")).toBe("PRO");
    expect(labelPlanoFromSlug("premium")).toBe("PREMIUM");
    expect(labelPlanoFromSlug(null)).toBeNull();
    expect(labelPlanoFromSlug("inexistente")).toBeNull();
  });
});
