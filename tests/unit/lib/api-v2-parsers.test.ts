import { describe, expect, it } from "vitest";

import {
  dossieFromStoredBlock,
  extrairDossieConsultaPremium,
  extrairLaudoTecnicoParaPdf,
  parsearGravameDossie,
  parsearLeilaoPrimeDossie,
  parsearRenainfDossie,
  parsearRouboFurtoDossie,
  renainfFromStored,
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
    expect(out.infracoes[0].numero_auto_infracao).toBeUndefined();
  });

  it("extrai auto, data e município quando aninhados em dados_infracao e eventos", () => {
    const dados = {
      registro_debitos_por_infracoes_renainf: {
        infracoes_renainf: {
          possui_infracoes: "sim",
          infracoes: [
            {
              dados_infracao: {
                infracao: "7455 - EXCESSO",
                numero_auto_infracao: "R400009999",
                orgao_autuador: "PRF",
                valor_aplicado: "130,16",
                local_infracao: "BR 163",
                municipio: "DOURADOS",
              },
              eventos: { data_hora_infracao: "08/02/2019" },
            },
          ],
        },
      },
    };
    const out = parsearRenainfDossie(dados);
    expect(out.infracoes[0].numero_auto_infracao).toBe("R400009999");
    expect(out.infracoes[0].data_hora_infracao).toBe("08/02/2019");
    expect(out.infracoes[0].municipio).toBe("DOURADOS");
  });
});

describe("renainfFromStored", () => {
  it("lê infrações com dados_infracao aninhados (igual payload persistido)", () => {
    const raw = {
      tipo: "renainf",
      kind: "renainf",
      valor_total_reais: 130.16,
      infracoes: [
        {
          dados_infracao: {
            infracao: "7455 - VELOCIDADE",
            numero_auto_infracao: "R1",
            orgao_autuador: "PRF",
            valor_aplicado: "130,16",
            local_infracao: "BR 163",
            municipio: "Dourados",
          },
          eventos: { data_hora_infracao: "08/02/2019" },
        },
      ],
    };
    const out = renainfFromStored(raw);
    expect(out?.infracoes).toHaveLength(1);
    expect(out?.infracoes[0].infracao).toContain("7455");
    expect(out?.infracoes[0].numero_auto_infracao).toBe("R1");
  });
});

describe("parsearGravameDossie", () => {
  it("extrai CNPJ e nome do agente financeiro", () => {
    const dados = {
      gravame: {
        possui_gravame: "sim",
        registro: {
          agente_financeiro: {
            cnpj: "90400888000142",
            nome: "BANCO SANTANDER SA",
          },
          data_registro: "07/07/2022",
          situacao: "CONSTA REGISTRO DE GRAVAME",
        },
      },
    };
    const out = parsearGravameDossie(dados);
    expect(out?.agente_financeiro_cnpj).toBe("90400888000142");
    expect(out?.agente_financeiro_nome).toBe("BANCO SANTANDER SA");
    expect(out?.situacao).toContain("GRAVAME");
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

describe("extrairLaudoTecnicoParaPdf", () => {
  it("inclui linhas de roubo, gravame com CNPJ e Renainf detalhado a partir de consultas_premium", () => {
    const dadosLeilao = {
      consultas_premium: {
        roubo_furto: {
          dossie: {
            kind: "roubo_furto",
            registros: [
              {
                boletim_ocorrencia: "9996",
                data_boletim_ocorrencia: "02/09/2019",
                tipo_ocorrencia: "Declaração de Roubo",
                uf_ocorrencia: "PR",
              },
            ],
          },
        },
        gravame: {
          dossie: {
            kind: "gravame",
            agente_financeiro_nome: "BANCO X",
            agente_financeiro_cnpj: "123",
            data_registro: "2022-01-01",
            situacao: "Ativo",
          },
        },
        renainf: {
          dossie: {
            kind: "renainf",
            valor_total_reais: 50,
            infracoes: [
              {
                dados_infracao: {
                  infracao: "Multa teste",
                  orgao_autuador: "PRF",
                  valor_aplicado: "50,00",
                  local_infracao: "BR-101",
                  numero_auto_infracao: "A99",
                  municipio: "Curitiba",
                },
                eventos: { data_hora_infracao: "01/01/2020" },
              },
            ],
          },
        },
      },
    };
    const laudo = extrairLaudoTecnicoParaPdf(dadosLeilao);
    expect(laudo.rouboLinhas.some((l) => l.includes("9996"))).toBe(true);
    expect(laudo.gravameLinhas.some((l) => l.includes("CNPJ: 123"))).toBe(true);
    expect(laudo.renainfLinhas.some((l) => l.includes("Auto: A99"))).toBe(
      true
    );
  });
});

describe("tituloClassificacaoLeilaoPrime", () => {
  it("retorna texto para C", () => {
    expect(tituloClassificacaoLeilaoPrime("C")).toContain("seguradora");
  });
});
