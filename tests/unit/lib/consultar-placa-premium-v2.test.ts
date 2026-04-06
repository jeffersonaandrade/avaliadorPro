import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
import {
  cachePremiumConsultaFresco,
  corpoRespostaMinimoValido,
  estruturaMinimaPorTipo,
  isSandboxMocksPremiumEnabled,
  normalizarConsultaPremiumV2,
  TTL_PREMIUM_DIAS,
} from "@/lib/consultar-placa-premium-v2";

describe("isSandboxMocksPremiumEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("com API_CONSULTAR_PLACA_TOKEN definido retorna false mesmo com USE_MOCKS true", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("API_CONSULTAR_PLACA_TOKEN", "secret-token");
    expect(isSandboxMocksPremiumEnabled()).toBe(false);
  });

  it("sem token e USE_MOCKS true retorna true", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("API_CONSULTAR_PLACA_TOKEN", "");
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
  it("normaliza leilao sem registro (nao / indisponivel)", () => {
    for (const possui_registro of ["nao", "não", "indisponivel", "indisponível"]) {
      const body = {
        status: "ok" as const,
        mensagem: "OK",
        dados: {
          informacoes_sobre_leilao: { possui_registro },
        },
      };
      const out = normalizarConsultaPremiumV2("leilao", body);
      expect(out.constatado, possui_registro).toBe(false);
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
});
