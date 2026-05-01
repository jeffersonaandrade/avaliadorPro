import { describe, expect, it } from "vitest";
import {
  blindagemCompletaJaAtiva,
  constatadoTriStateConsultaPlaca,
  criarRiscosPremiumSimuladosExibicao,
  dadosLeilaoSemConsultasPremium,
  extrairRiscosCarregadosDeDadosLeilao,
  mergeFlagsComConsultasPremium,
  triPossuiRegistroConsultaPlaca,
} from "@/lib/consultas-risco-premium";

describe("dadosLeilaoSemConsultasPremium", () => {
  it("remove apenas consultas_premium", () => {
    const raw = { a: 1, consultas_premium: { leilao: {} } };
    const out = dadosLeilaoSemConsultasPremium(raw) as Record<string, unknown>;
    expect(out.a).toBe(1);
    expect(out.consultas_premium).toBeUndefined();
  });

  it("retorna primitivos intactos", () => {
    expect(dadosLeilaoSemConsultasPremium(null)).toBeNull();
    expect(dadosLeilaoSemConsultasPremium([])).toEqual([]);
  });
});

describe("triPossuiRegistroConsultaPlaca", () => {
  it("classifica sim, nao e indisponivel", () => {
    expect(triPossuiRegistroConsultaPlaca("sim")).toBe("sim");
    expect(triPossuiRegistroConsultaPlaca("não")).toBe("nao");
    expect(triPossuiRegistroConsultaPlaca("indisponível")).toBe("indisponivel");
  });
});

describe("constatadoTriStateConsultaPlaca", () => {
  it("true somente para sim (inclui espaços e maiúsculas)", () => {
    expect(constatadoTriStateConsultaPlaca("sim")).toBe(true);
    expect(constatadoTriStateConsultaPlaca(" SIM ")).toBe(true);
  });

  it("false para nao, não e indisponivel", () => {
    expect(constatadoTriStateConsultaPlaca("nao")).toBe(false);
    expect(constatadoTriStateConsultaPlaca("não")).toBe(false);
    expect(constatadoTriStateConsultaPlaca("indisponivel")).toBe(false);
    expect(constatadoTriStateConsultaPlaca("indisponível")).toBe(false);
  });
});

describe("extrairRiscosCarregadosDeDadosLeilao", () => {
  it("vazio sem bloco consultas_premium", () => {
    expect(extrairRiscosCarregadosDeDadosLeilao({})).toEqual({});
  });

  it("ignora item sem consultado_em", () => {
    const out = extrairRiscosCarregadosDeDadosLeilao({
      consultas_premium: {
        leilao: { constatado: true, resumo: "x" },
      },
    });
    expect(out.leilao).toBeUndefined();
  });

  it("lê consultado_em e camelCase consultadoEm", () => {
    const iso = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const a = extrairRiscosCarregadosDeDadosLeilao({
      consultas_premium: {
        leilao: { consultado_em: iso, constatado: true, resumo: "ok" },
        sinistro: { consultadoEm: iso, constatado: false },
      },
    });
    expect(a.leilao?.consultadoEm).toBe(iso);
    expect(a.leilao?.constatado).toBe(true);
    expect(a.sinistro?.resumo).toBe("Nada constatado nesta consulta.");
  });

  it("aceita constatado string tri-state da API (legado)", () => {
    const iso = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const a = extrairRiscosCarregadosDeDadosLeilao({
      consultas_premium: {
        leilao: { consultado_em: iso, constatado: "sim", resumo: "ok" },
        sinistro: {
          consultado_em: iso,
          constatado: "indisponivel",
          resumo: "x",
        },
      },
    });
    expect(a.leilao?.constatado).toBe(true);
    expect(a.sinistro?.constatado).toBe(false);
  });
});

describe("criarRiscosPremiumSimuladosExibicao", () => {
  it("preenche os tipos premium com Sim/Não explícitos na mensagem", () => {
    const iso = "2026-01-01T00:00:00.000Z";
    const m = criarRiscosPremiumSimuladosExibicao(iso);
    expect(m.leilao?.consultadoEm).toBe(iso);
    expect(m.leilao?.constatado).toBe(false);
    expect(m.leilao?.resumo).toContain("Leilão: Não");
    expect(m.sinistro?.constatado).toBe(true);
    expect(m.sinistro?.resumo).toContain("Sinistro: Sim");
    expect(m.roubo_furto?.resumo).toContain("Não");
    expect(m.gravame?.resumo).toContain("Não");
    expect(m.renainf?.resumo).toContain("Renainf: Não");
  });
});

describe("blindagemCompletaJaAtiva", () => {
  const isoFresco = new Date().toISOString();
  const itemFresco = {
    consultado_em: isoFresco,
    constatado: false,
    resumo: "ok",
  };

  it("false sem todos os tipos premium consultados", () => {
    expect(
      blindagemCompletaJaAtiva({
        consultas_premium: { leilao: itemFresco },
      })
    ).toBe(false);
  });

  it("true quando todos os tipos premium têm cache dentro do TTL (7 dias)", () => {
    expect(
      blindagemCompletaJaAtiva({
        consultas_premium: {
          leilao: itemFresco,
          sinistro: itemFresco,
          roubo_furto: itemFresco,
          gravame: itemFresco,
          renainf: itemFresco,
        },
      })
    ).toBe(true);
  });

  it("false quando consulta existe mas está expirada (fora do TTL)", () => {
    const isoVelho = new Date(Date.now() - 8 * 86_400_000).toISOString();
    const itemVelho = {
      consultado_em: isoVelho,
      constatado: false,
      resumo: "ok",
    };
    expect(
      blindagemCompletaJaAtiva({
        consultas_premium: {
          leilao: itemVelho,
          sinistro: itemVelho,
          roubo_furto: itemVelho,
          gravame: itemVelho,
          renainf: itemVelho,
        },
      })
    ).toBe(false);
  });
});

describe("mergeFlagsComConsultasPremium", () => {
  const base = {
    leilao: false,
    sinistro: false,
    roubo: true,
    gravame: false,
    renainf: false,
  };

  it("sobrescreve flags com resultado premium", () => {
    const out = mergeFlagsComConsultasPremium(base, {
      leilao: {
        consultadoEm: "x",
        constatado: true,
        resumo: "r",
      },
      roubo_furto: {
        consultadoEm: "x",
        constatado: false,
        resumo: "r",
      },
    });
    expect(out.leilao).toBe(true);
    expect(out.roubo).toBe(false);
  });
});
