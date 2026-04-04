import { describe, expect, it } from "vitest";
import { extrairFlagsHistoricoVeiculo } from "@/components/formulario-viabilidade/historico-veiculo";

describe("extrairFlagsHistoricoVeiculo", () => {
  it("retorna tudo false para objeto vazio", () => {
    const f = extrairFlagsHistoricoVeiculo({});
    expect(f).toEqual({
      leilao: false,
      sinistro: false,
      roubo: false,
      gravame: false,
    });
  });

  it("detecta sinônimos no primeiro nível", () => {
    const f = extrairFlagsHistoricoVeiculo({
      passagem_leilao: "sim",
      perda_total: true,
    });
    expect(f.leilao).toBe(true);
    expect(f.sinistro).toBe(true);
  });

  it("varre objetos aninhados", () => {
    const f = extrairFlagsHistoricoVeiculo({
      detalhes: { gravame: "S" },
    });
    expect(f.gravame).toBe(true);
  });

  it("interpreta strings negativas como inativo", () => {
    const f = extrairFlagsHistoricoVeiculo({
      leilao: "não consta",
      sinistro: "nao",
    });
    expect(f.leilao).toBe(false);
    expect(f.sinistro).toBe(false);
  });

  it("roubo_furto casa com fator roubo", () => {
    const f = extrairFlagsHistoricoVeiculo({ roubo_furto: 1 });
    expect(f.roubo).toBe(true);
  });

  it("API v2: possui_registro sim em informacoes_sobre_leilao ativa leilao", () => {
    const f = extrairFlagsHistoricoVeiculo({
      informacoes_sobre_leilao: { possui_registro: "sim" },
    });
    expect(f.leilao).toBe(true);
  });

  it("API v2: possui_registro indisponivel ou nao não ativa leilao", () => {
    expect(
      extrairFlagsHistoricoVeiculo({
        informacoes_sobre_leilao: { possui_registro: "indisponivel" },
      }).leilao
    ).toBe(false);
    expect(
      extrairFlagsHistoricoVeiculo({
        dados: {
          informacoes_sobre_leilao: { possui_registro: "nao" },
        },
      }).leilao
    ).toBe(false);
  });

  it("API v2: possui_registro sim em registro_sinistro_com_perda_total", () => {
    const f = extrairFlagsHistoricoVeiculo({
      registro_sinistro_com_perda_total: { possui_registro: "sim" },
    });
    expect(f.sinistro).toBe(true);
  });

  it("API v2: possui_registro em registros_roubo_furto", () => {
    const f = extrairFlagsHistoricoVeiculo({
      historico_roubo_furto: {
        registros_roubo_furto: { possui_registro: "sim", registros: [] },
      },
    });
    expect(f.roubo).toBe(true);
  });

  it("API v2: possui_gravame sim dentro de gravame", () => {
    const f = extrairFlagsHistoricoVeiculo({
      gravame: { possui_gravame: "sim" },
    });
    expect(f.gravame).toBe(true);
  });

  it("API v2: possui_gravame indisponivel não ativa gravame", () => {
    const f = extrairFlagsHistoricoVeiculo({
      gravame: { possui_gravame: "indisponivel" },
    });
    expect(f.gravame).toBe(false);
  });
});
