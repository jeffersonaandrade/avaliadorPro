import { describe, expect, it } from "vitest";

import { obterMicrocopyDecisao } from "@/lib/microcopy-decisao";

describe("obterMicrocopyDecisao", () => {
  it("retorna microcopy vermelho com impacto e risco", () => {
    const r = obterMicrocopyDecisao("vermelho", 21621.5, ["Leilao", "Sinistro"]);
    expect(r.titulo).toContain("NAO COMPRE");
    expect(r.impacto).toContain("R$");
    expect(r.risco).toContain("Leilao");
    expect(r.recomendacao).toContain("exceto");
  });

  it("retorna microcopy amarelo orientado a desconto", () => {
    const r = obterMicrocopyDecisao("amarelo", 1200, ["Roubo"]);
    expect(r.titulo).toContain("SO COM DESCONTO");
    expect(r.subtitulo).toContain("preco precisa cair");
    expect(r.recomendacao).toContain("maximo seguro");
    expect(r.liquidez).toContain("patio");
  });

  it("retorna microcopy verde", () => {
    const r = obterMicrocopyDecisao("verde", 0, []);
    expect(r.titulo).toContain("BOA COMPRA");
    expect(r.liquidez).toContain("liquidez");
    expect(r.recomendacao).toContain("nao ultrapasse");
  });

  it("retorna incompleto quando estado for incompleto", () => {
    const r = obterMicrocopyDecisao("incompleto");
    expect(r.titulo).toContain("RISCO NAO VALIDADO");
    expect(r.recomendacao).toContain("historico");
  });
});

