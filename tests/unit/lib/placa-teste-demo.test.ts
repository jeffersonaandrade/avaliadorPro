import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPlacaVeiculoDemonstracao,
  isResultadoVeiculoModoDemonstracao,
  obterPlacaVeiculoDemonstracao,
  PLACA_VEICULO_DEMONSTRACAO_PADRAO,
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
});
