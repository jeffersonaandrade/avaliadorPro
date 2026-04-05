import { describe, expect, it } from "vitest";

import {
  dossieFromStoredBlock,
  extrairDossieConsultaPremium,
  parsearLeilaoPrimeDossie,
  parsearRenainfDossie,
  parsearRouboFurtoDossie,
  serializarDossieParaPersistencia,
  tituloClassificacaoLeilaoPrime,
} from "@/lib/api-v2/parsers";

describe("parsearLeilaoPrimeDossie", () => {
  it("extrai classificação, registro_leiloes.registros, dicionário, IA na raiz e URLs", () => {
    const dados = {
      informacoes_sobre_leilao: {
        possui_registro: "sim",
        registro_sobre_oferta: {
          classificacao: "C",
          dicionario_classificacoes: {
            C: {
              titulo: "(Seguradoras / Detrans)",
              descricao: "Texto longo da classe C.",
            },
          },
        },
        registro_leiloes: {
          registros: [
            {
              comitente: "HDI SEGUROS",
              lote: "L1",
              data_leilao: "2024-01-10",
            },
          ],
        },
        fotos: ["https://exemplo.com/a.jpg"],
      },
      informacoes_possiveis_danos_detectados_por_ia: {
        possiveis_dados: [
          { local: "Capô", descricao: "Amassado", probabilidade: "70%" },
        ],
      },
    };
    const out = parsearLeilaoPrimeDossie(dados);
    expect(out?.classificacao_letra).toBe("C");
    expect(out?.classificacao_titulo).toContain("Seguradoras");
    expect(out?.classificacao_descricao).toContain("classe C");
    expect(out?.registros[0]?.comitente).toBe("HDI SEGUROS");
    expect(out?.ia_danos[0]?.local).toBe("Capô");
    expect(out?.fotos_remarketing[0]).toContain("exemplo.com");
    expect(out?.imagens_ia).toEqual([]);
  });
});

describe("parsearRenainfDossie", () => {
  it("lê infracoes com dados_infracao aninhados", () => {
    const dados = {
      registro_debitos_por_infracoes_renainf: {
        infracoes_renainf: {
          possui_infracoes: "sim",
          infracoes: [
            {
              dados_infracao: {
                infracao: "7455 - EXCESSO DE VELOCIDADE",
                orgao_autuador: "PRF",
                valor_aplicado: "130,16",
                local_infracao: "BR 163 KM 270",
              },
            },
          ],
        },
      },
    };
    const out = parsearRenainfDossie(dados);
    expect(out.infracoes).toHaveLength(1);
    expect(out.infracoes[0].infracao).toContain("7455");
    expect(out.infracoes[0].orgao_autuador).toBe("PRF");
    expect(out.valor_total_reais).toBeGreaterThan(0);
  });
});

describe("parsearRouboFurtoDossie", () => {
  it("lê registros em historico_roubo_furto", () => {
    const dados = {
      historico_roubo_furto: {
        registros_roubo_furto: {
          possui_registro: "sim",
          registros: [
            {
              boletim_ocorrencia: "BO-1",
              data_boletim_ocorrencia: "2023-05-01",
              tipo_ocorrencia: "Furto",
              uf_ocorrencia: "PR",
            },
          ],
        },
      },
    };
    const out = parsearRouboFurtoDossie(dados);
    expect(out.registros).toHaveLength(1);
    expect(out.registros[0].uf_ocorrencia).toBe("PR");
  });
});

describe("serializarDossieParaPersistencia + dossieFromStoredBlock", () => {
  it("roundtrip leilão", () => {
    const d = extrairDossieConsultaPremium("leilao", {
      informacoes_sobre_leilao: {
        registro_sobre_oferta: { classificacao: "B" },
        registro_leiloes: {
          registros: [{ comitente: "X", lote: "1", data_leilao: "2020-01-01" }],
        },
      },
    });
    expect(d?.tipo).toBe("leilao");
    const ser = serializarDossieParaPersistencia("leilao", d);
    const back = dossieFromStoredBlock(ser);
    expect(back?.tipo).toBe("leilao");
    if (back?.tipo === "leilao") {
      expect(back.dados.classificacao_letra).toBe("B");
      expect(back.dados.registros[0].comitente).toBe("X");
    }
  });
});

describe("tituloClassificacaoLeilaoPrime", () => {
  it("retorna texto para C", () => {
    expect(tituloClassificacaoLeilaoPrime("C")).toContain("seguradora");
  });
});
