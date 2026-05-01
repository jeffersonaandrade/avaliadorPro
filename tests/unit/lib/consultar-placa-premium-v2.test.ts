import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
import {
  cachePremiumConsultaFresco,
  corpoRespostaMinimoValido,
  estruturaMinimaPorTipo,
  isSandboxMocksPremiumEnabled,
  normalizarConsultaPremiumV2,
  resolverPlacaParametroConsultaPremiumV2,
  TTL_PREMIUM_DIAS,
} from "@/lib/consultar-placa-premium-v2";

describe("resolverPlacaParametroConsultaPremiumV2", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("com USE_MOCKS true retorna placa de demonstracao do env", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "AAA9999");
    expect(resolverPlacaParametroConsultaPremiumV2("ABC1D23")).toBe("AAA9999");
  });

  it("com USE_MOCKS false mantem a placa da analise", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "AAA9999");
    expect(resolverPlacaParametroConsultaPremiumV2("ABC1D23")).toBe("ABC1D23");
  });

  it("USE_MOCKS True (maiúsculo) não substitui — exige literal 'true'", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "True");
    vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "AAA9999");
    expect(resolverPlacaParametroConsultaPremiumV2("ABC1D23")).toBe("ABC1D23");
  });
});

describe("isSandboxMocksPremiumEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("com API_CONSULTAR_PLACA_TOKEN definido retorna false mesmo com USE_MOCKS true", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("API_CONSULTAR_PLACA_TOKEN", "secret-token");
    vi.stubEnv("CONSULTAR_PLACA_API_EMAIL", "");
    vi.stubEnv("CONSULTAR_PLACA_API_KEY", "");
    expect(isSandboxMocksPremiumEnabled()).toBe(false);
  });

  it("com CONSULTAR_PLACA_API_EMAIL + KEY retorna false mesmo com USE_MOCKS true (Basic v2)", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("API_CONSULTAR_PLACA_TOKEN", "");
    vi.stubEnv("CONSULTAR_PLACA_API_EMAIL", "a@b.com");
    vi.stubEnv("CONSULTAR_PLACA_API_KEY", "k");
    expect(isSandboxMocksPremiumEnabled()).toBe(false);
  });

  it("sem Bearer nem email+key e USE_MOCKS true retorna true", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("API_CONSULTAR_PLACA_TOKEN", "");
    vi.stubEnv("CONSULTAR_PLACA_API_EMAIL", "");
    vi.stubEnv("CONSULTAR_PLACA_API_KEY", "");
    expect(isSandboxMocksPremiumEnabled()).toBe(true);
  });
});

describe("cachePremiumConsultaFresco", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna false para ISO inválido", () => {
    expect(cachePremiumConsultaFresco("")).toBe(false);
    expect(cachePremiumConsultaFresco("não-iso")).toBe(false);
  });

  it("retorna true quando consulta está dentro do TTL", () => {
    const agora = Date.UTC(2026, 0, 10, 12, 0, 0);
    vi.setSystemTime(agora);
    const dentro = new Date(agora - (TTL_PREMIUM_DIAS - 1) * 86_400_000).toISOString();
    expect(cachePremiumConsultaFresco(dentro)).toBe(true);
  });

  it("retorna false após 7 dias", () => {
    const agora = Date.UTC(2026, 0, 10, 12, 0, 0);
    vi.setSystemTime(agora);
    const expirado = new Date(agora - TTL_PREMIUM_DIAS * 86_400_000 - 1).toISOString();
    expect(cachePremiumConsultaFresco(expirado)).toBe(false);
  });
});

describe("corpoRespostaMinimoValido + estruturaMinimaPorTipo", () => {
  it("rejeita status diferente de ok", () => {
    expect(
      corpoRespostaMinimoValido({ status: "erro", dados: {} })
    ).toBe(false);
  });

  it("aceita leilao com informacoes_sobre_leilao", () => {
    const dados = { informacoes_sobre_leilao: { possui_registro: "não" } };
    expect(estruturaMinimaPorTipo("leilao", dados)).toBe(true);
  });

  it("aceita roubo_furto com registros_roubo_furto objeto", () => {
    const dados = {
      historico_roubo_furto: {
        registros_roubo_furto: { possui_registro: "não", registros: [] },
      },
    };
    expect(estruturaMinimaPorTipo("roubo_furto", dados)).toBe(true);
  });
});

describe("normalizarConsultaPremiumV2", () => {
  it("normaliza leilao sem registro (nao)", () => {
    for (const possui_registro of ["nao", "não"]) {
      const body = {
        status: "ok" as const,
        mensagem: "OK",
        dados: {
          informacoes_sobre_leilao: { possui_registro },
        },
      };
      const out = normalizarConsultaPremiumV2("leilao", body);
      expect(out.constatado, possui_registro).toBe(false);
      expect(out.resumo).toMatch(/sem registro de oferta/i);
    }
  });

  it("normaliza leilao indisponivel na fonte (nao constatado, resumo especifico)", () => {
    for (const possui_registro of ["indisponivel", "indisponível"]) {
      const body = {
        status: "ok" as const,
        mensagem: "OK",
        dados: {
          informacoes_sobre_leilao: { possui_registro },
        },
      };
      const out = normalizarConsultaPremiumV2("leilao", body);
      expect(out.constatado, possui_registro).toBe(false);
      expect(out.resumo).toMatch(/indispon/i);
    }
  });

  it("normaliza gravame com registro", () => {
    const body = {
      status: "ok" as const,
      dados: {
        gravame: {
          possui_gravame: "sim",
          registro: { situacao: "Ativo" },
        },
      },
    };
    const out = normalizarConsultaPremiumV2("gravame", body);
    expect(out.constatado).toBe(true);
    expect(out.resumo).toContain("Gravame");
  });

  it("sinistro: doc. oficial — sim com texto de registro", () => {
    const body = {
      status: "ok" as const,
      mensagem: "Consulta realizada com sucesso!",
      dados: {
        registro_sinistro_com_perda_total: {
          possui_registro: "sim",
          registro: "CONSTA INDENIZAÇÃO INTEGRAL",
        },
      },
    };
    const out = normalizarConsultaPremiumV2("sinistro", body);
    expect(out.constatado).toBe(true);
    expect(out.resumo).toContain("CONSTA INDENIZAÇÃO INTEGRAL");
  });

  it("renainf: possui_infracoes indisponivel retorna resumo dedicado", () => {
    const body = {
      status: "ok" as const,
      dados: {
        registro_debitos_por_infracoes_renainf: {
          infracoes_renainf: {
            possui_infracoes: "indisponivel",
            infracoes: [],
          },
        },
      },
    };
    const out = normalizarConsultaPremiumV2("renainf", body);
    expect(out.constatado).toBe(false);
    expect(out.resumo).toContain("indisponível");
  });

  it("gravame: indisponivel não usa texto de sem registro ativo", () => {
    const out = normalizarConsultaPremiumV2("gravame", {
      status: "ok" as const,
      dados: {
        gravame: { possui_gravame: "indisponivel", registro: null },
      },
    });
    expect(out.constatado).toBe(false);
    expect(out.resumo).toContain("indisponível");
  });

  it("sinistro: nao e indisponivel (resumos distintos)", () => {
    const nao = normalizarConsultaPremiumV2("sinistro", {
      status: "ok" as const,
      dados: {
        registro_sinistro_com_perda_total: {
          possui_registro: "nao",
          registro: "",
        },
      },
    });
    expect(nao.constatado).toBe(false);
    expect(nao.resumo).toContain("sem registro");

    const ind = normalizarConsultaPremiumV2("sinistro", {
      status: "ok" as const,
      dados: {
        registro_sinistro_com_perda_total: {
          possui_registro: "indisponivel",
          registro: "",
        },
      },
    });
    expect(ind.constatado).toBe(false);
    expect(ind.resumo).toContain("indisponível");
  });
});
