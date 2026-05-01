import { describe, expect, it } from "vitest";

import { obterCopyBlindagem } from "@/lib/copy-blindagem";

describe("obterCopyBlindagem", () => {
  it("retorna estado sem blindagem com crédito", () => {
    const copy = obterCopyBlindagem({
      blindagemAtiva: false,
      temCredito: true,
      temRiscoEstrutural: false,
    });
    expect(copy.estado).toBe("sem_blindagem_com_credito");
    expect(copy.titulo).toContain("não sabe o risco real");
    expect(copy.bullets).toHaveLength(3);
    expect(copy.cta).toContain("1 crédito");
  });

  it("retorna estado sem blindagem e sem crédito", () => {
    const copy = obterCopyBlindagem({
      blindagemAtiva: false,
      temCredito: false,
      temRiscoEstrutural: false,
    });
    expect(copy.estado).toBe("sem_blindagem_sem_credito");
    expect(copy.titulo).toContain("Histórico não validado");
    expect(copy.cta).toBe("Comprar créditos");
  });

  it("retorna estado com risco após blindagem", () => {
    const copy = obterCopyBlindagem({
      blindagemAtiva: true,
      temCredito: true,
      temRiscoEstrutural: true,
    });
    expect(copy.estado).toBe("blindagem_com_risco");
    expect(copy.titulo).toContain("Risco confirmado");
    expect(copy.impacto).toContain("pode perder");
  });

  it("retorna estado limpo após blindagem", () => {
    const copy = obterCopyBlindagem({
      blindagemAtiva: true,
      temCredito: true,
      temRiscoEstrutural: false,
    });
    expect(copy.estado).toBe("blindagem_limpo");
    expect(copy.titulo).toContain("Histórico validado");
    expect(copy.cta).toContain("Seguir");
  });
});

