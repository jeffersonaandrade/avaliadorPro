import { afterEach, describe, expect, it, vi } from "vitest";

const okJson = {
  status: "ok" as const,
  dados: {
    informacoes_veiculo: {
      dados_veiculo: {
        placa: "AAA0000",
        ano_frabricacao: "2014",
        ano_modelo: 2020,
        marca: "HYUNDAI",
        modelo: "HB20",
      },
    },
  },
};

describe("consultarInformacoesBasicas — URL da API vs placa persistida", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("USE_MOCKS 'true': URL usa placa de demonstração; retorno mantém placa solicitada", async () => {
    vi.stubEnv("CONSULTAR_PLACA_API_EMAIL", "a@b.com");
    vi.stubEnv("CONSULTAR_PLACA_API_KEY", "k");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "AAA0000");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => okJson,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { consultarInformacoesBasicas } = await import("@/lib/consultar-placa");
    const out = await consultarInformacoesBasicas("ABC1D23");

    expect(out.placa).toBe("ABC1D23");
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("placa=AAA0000");
    expect(calledUrl).not.toContain("ABC1D23");
  });

  it("sem mock: URL usa a mesma placa solicitada", async () => {
    vi.stubEnv("CONSULTAR_PLACA_API_EMAIL", "a@b.com");
    vi.stubEnv("CONSULTAR_PLACA_API_KEY", "k");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => okJson,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { consultarInformacoesBasicas } = await import("@/lib/consultar-placa");
    await consultarInformacoesBasicas("ABC1D23");

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("placa=ABC1D23");
  });
});

describe("consultarPrecoFipePorPlaca", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("consulta endpoint consultarPrecoFipe e formata retorno", async () => {
    vi.stubEnv("CONSULTAR_PLACA_API_EMAIL", "a@b.com");
    vi.stubEnv("CONSULTAR_PLACA_API_KEY", "k");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ok",
        dados: {
          informacoes_fipe: [
            {
              codigo_fipe: "015099-1",
              modelo_versao: "HB20 1.0",
              preco: "43208.00",
              mes_referencia: "2025_04",
              historico: {
                "2025_03": "43052.00",
                "2025_04": "43208.00",
              },
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { consultarPrecoFipePorPlaca } = await import("@/lib/consultar-placa");
    const out = await consultarPrecoFipePorPlaca("ABC1D23", {
      modeloVeiculo: "HB20 1.0",
      anoModelo: 2015,
    });

    expect(String(fetchMock.mock.calls[0][0])).toContain("consultarPrecoFipe");
    expect(out).toEqual({
      valor: "R$ 43.208,00",
      mesReferencia: "2025_04",
      modeloFipeNome: "HB20 1.0",
      combustivelFipe: "—",
      codigoFipe: "015099-1",
      historico12Meses: {
        "2025_03": "R$ 43.052,00",
        "2025_04": "R$ 43.208,00",
      },
    });
  });

  it("usa fallback e retorna aviso quando ha multiplas opcoes sem match confiavel", async () => {
    vi.stubEnv("CONSULTAR_PLACA_API_EMAIL", "a@b.com");
    vi.stubEnv("CONSULTAR_PLACA_API_KEY", "k");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ok",
        dados: {
          informacoes_fipe: [
            {
              codigo_fipe: "111",
              modelo_versao: "Modelo A",
              preco: "10000.00",
              mes_referencia: "2025_04",
            },
            {
              codigo_fipe: "222",
              modelo_versao: "Modelo B",
              preco: "20000.00",
              mes_referencia: "2025_04",
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { consultarPrecoFipePorPlaca } = await import("@/lib/consultar-placa");
    const out = await consultarPrecoFipePorPlaca("ABC1D23", {
      modeloVeiculo: "Sem correspondencia",
      anoModelo: 2015,
    });

    expect(out?.codigoFipe).toBe("111");
    expect(out?.avisoFipe).toContain("Multiplas versoes FIPE");
  });
});
