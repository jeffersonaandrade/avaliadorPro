import { describe, expect, it } from "vitest";
import { normalizarPlacaInput, placaSchema } from "@/lib/validations";

describe("normalizarPlacaInput", () => {
  it("remove espaços e hífens e coloca maiúsculas", () => {
    expect(normalizarPlacaInput(" abc-1234 ")).toBe("ABC1234");
    expect(normalizarPlacaInput("abc 1d23")).toBe("ABC1D23");
  });
});

describe("placaSchema", () => {
  it("aceita formato antigo", () => {
    const r = placaSchema.safeParse("abc1234");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("ABC1234");
  });

  it("aceita Mercosul", () => {
    const r = placaSchema.safeParse("ABC1D23");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("ABC1D23");
  });

  it("rejeita formato inválido", () => {
    expect(placaSchema.safeParse("AB12345").success).toBe(false);
    expect(placaSchema.safeParse("ABCD123").success).toBe(false);
  });
});
