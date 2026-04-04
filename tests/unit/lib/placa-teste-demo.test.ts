import { describe, expect, it } from "vitest";
import {
  isPlacaVeiculoDemonstracao,
  isResultadoVeiculoModoDemonstracao,
  PLACA_VEICULO_DEMONSTRACAO,
} from "@/lib/placa-teste-demo";

describe("placa-teste-demo", () => {
  it("reconhece AAA0000 com ou sem normalização visual", () => {
    expect(PLACA_VEICULO_DEMONSTRACAO).toBe("AAA0000");
    expect(isPlacaVeiculoDemonstracao("AAA0000")).toBe(true);
    expect(isPlacaVeiculoDemonstracao("aaa-0000")).toBe(true);
    expect(isPlacaVeiculoDemonstracao("ABC1234")).toBe(false);
  });

  it("modo demonstração na UI: sandbox ativo OU placa AAA0000", () => {
    expect(isResultadoVeiculoModoDemonstracao(true, "XYZ9999")).toBe(true);
    expect(isResultadoVeiculoModoDemonstracao(false, "AAA0000")).toBe(true);
    expect(isResultadoVeiculoModoDemonstracao(false, "ABC1234")).toBe(false);
  });
});
