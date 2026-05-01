import { describe, expect, it } from "vitest";

import { gerarArgumentoNegociacao } from "@/lib/argumento-negociacao";

describe("gerarArgumentoNegociacao", () => {
  it("estado vermelho", () => {
    const r = gerarArgumentoNegociacao({
      estado: "vermelho",
      precoMaximoSeguro: 18801.3,
      valorEvitarPerda: 21621.5,
      riscosResumo: ["Leilão", "Sinistro"],
    });
    expect(r.titulo).toContain("baixar forte");
    expect(r.mensagemCopiavel).toContain("R$");
    expect(r.mensagemCopiavel).toContain("não fecha");
  });

  it("estado amarelo com faixa", () => {
    const r = gerarArgumentoNegociacao({
      estado: "amarelo",
      faixaInicialMin: 16900,
      faixaInicialMax: 18200,
      precoMaximoSeguro: 18801,
    });
    expect(r.mensagemCopiavel).toContain("entre");
    expect(r.mensagemCopiavel).toContain("R$");
  });

  it("estado amarelo sem faixa usa fallback", () => {
    const r = gerarArgumentoNegociacao({
      estado: "amarelo",
      precoMaximoSeguro: 18801,
    });
    expect(r.mensagemCopiavel).toContain("abaixo de");
  });

  it("estado verde", () => {
    const r = gerarArgumentoNegociacao({
      estado: "verde",
      precoMaximoSeguro: 18801,
    });
    expect(r.titulo).toContain("Boa oportunidade");
    expect(r.mensagemCopiavel).toContain("até");
  });

  it("estado incompleto", () => {
    const r = gerarArgumentoNegociacao({
      estado: "incompleto",
    });
    expect(r.titulo).toContain("escuro");
    expect(r.mensagemCopiavel).toContain("histórico");
  });
});

