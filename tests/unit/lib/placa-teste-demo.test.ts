import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPlacaVeiculoDemonstracao,
  isResultadoVeiculoModoDemonstracao,
  obterPlacaVeiculoDemonstracao,
  PLACA_VEICULO_DEMONSTRACAO_PADRAO,
  resolverPlacaParaRequisicaoConsultarPlacaApi,
} from "@/lib/placa-teste-demo";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("placa-teste-demo", () => {
  it("padrão documental AAA0000", () => {
    expect(PLACA_VEICULO_DEMONSTRACAO_PADRAO).toBe("AAA0000");
  });

  it("sem NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO usa padrão", () => {
    vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "");
    expect(obterPlacaVeiculoDemonstracao()).toBe("AAA0000");
    expect(isPlacaVeiculoDemonstracao("AAA0000")).toBe(true);
    expect(isPlacaVeiculoDemonstracao("aaa-0000")).toBe(true);
    expect(isPlacaVeiculoDemonstracao("ABC1234")).toBe(false);
  });

  it("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO válida substitui o padrão", () => {
    vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "BBB1B34");
    expect(obterPlacaVeiculoDemonstracao()).toBe("BBB1B34");
    expect(isPlacaVeiculoDemonstracao("bbb-1b34")).toBe(true);
    expect(isPlacaVeiculoDemonstracao("AAA0000")).toBe(false);
  });

  it("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO inválida cai no padrão", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "ZZZ");
    expect(obterPlacaVeiculoDemonstracao()).toBe("AAA0000");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("modo demonstração na UI: sandbox ativo OU placa de demonstração", () => {
    vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "");
    expect(isResultadoVeiculoModoDemonstracao(true, "XYZ9999")).toBe(true);
    expect(isResultadoVeiculoModoDemonstracao(false, "AAA0000")).toBe(true);
    expect(isResultadoVeiculoModoDemonstracao(false, "ABC1234")).toBe(false);
  });

  describe("resolverPlacaParaRequisicaoConsultarPlacaApi", () => {
    it("USE_MOCKS literal 'true' troca pela placa de demonstração (env ou AAA0000)", () => {
      vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
      vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "BBB1B34");
      expect(resolverPlacaParaRequisicaoConsultarPlacaApi("BRASIL22")).toBe(
        "BBB1B34"
      );
    });

    it("USE_MOCKS true com env vazio usa AAA0000", () => {
      vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
      vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "");
      expect(resolverPlacaParaRequisicaoConsultarPlacaApi("XYZ9999")).toBe(
        "AAA0000"
      );
    });

    it("USE_MOCKS não é o literal 'true' — não substitui (ex. True maiúsculo)", () => {
      vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "True");
      vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "AAA0000");
      expect(resolverPlacaParaRequisicaoConsultarPlacaApi("ABC1D23")).toBe(
        "ABC1D23"
      );
    });

    it("USE_MOCKS false mantém placa original", () => {
      vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
      vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "AAA0000");
      expect(resolverPlacaParaRequisicaoConsultarPlacaApi("ABC1D23")).toBe(
        "ABC1D23"
      );
    });

    it("NODE_ENV production + USE_MOCKS true não substitui placa (trava anti-PRD)", () => {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
      vi.stubEnv("NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO", "AAA0000");
      vi.stubEnv("NODE_ENV", "production");
      expect(resolverPlacaParaRequisicaoConsultarPlacaApi("BRASIL22")).toBe(
        "BRASIL22"
      );
      expect(err).toHaveBeenCalled();
      err.mockRestore();
    });
  });
});
