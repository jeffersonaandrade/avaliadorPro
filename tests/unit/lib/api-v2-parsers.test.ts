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

  it("extrai sinistros, parecer tecnico, remarketing, pecas IA e registro com placa/classi", () => {
    const dados = {
      informacoes_sobre_leilao: {
        possui_registro: "sim",
        registro_sobre_oferta: { classificacao: "C" },
        registro_leiloes: {
          registros: [
            {
              comitente: "HDI",
              lote: "148",
              data_leilao: "09/11/2021",
              placa: "QOQ8436",
              classi: "9AAAA99",
              renavam: "123",
              ano_fabricacao: "2018",
            },
          ],
        },
        registro_sinistros_acidentes: { possui_registro: "nao" },
        parecer_tecnico: {
          parecer: "favoravel",
          detalhes: {
            registro_veiculo_importado: "nao",
          },
        },
      },
      informacoes_sobre_remarketing: {
        possui_registro: "sim",
        registros: [
          {
            item: "26",
            organizador: "OrgX",
            data_evento: "16/11/2016",
            condicao_motor: "ok",
          },
        ],
      },
      informacoes_possiveis_danos_detectados_por_ia: {
        situacao_analise: "concluido",
        possiveis_dados: [
          { local: "Capo", descricao: "Arranhao", probabilidade: 41 },
        ],
        possiveis_pecas_danificadas: [
          { descricao: "Capo", probabilidade: 100 },
        ],
      },
    };
    const out = parsearLeilaoPrimeDossie(dados);
    expect(out?.registros[0]?.veiculo_placa).toBe("QOQ8436");
    expect(out?.registros[0]?.chassi_mascarado).toBe("9AAAA99");
    expect(out?.sinistros_acidentes_possui_registro).toBe("nao");
    expect(out?.parecer_tecnico_parecer).toBe("favoravel");
    expect(out?.parecer_tecnico_detalhes?.registro_veiculo_importado).toBe(
      "nao"
    );
    expect(out?.remarketing_registros?.[0]?.organizador).toBe("OrgX");
    expect(out?.ia_situacao_analise).toBe("concluido");
    expect(out?.ia_danos[0]?.probabilidade).toBe("41%");
    expect(out?.ia_pecas_danificadas?.[0]?.descricao).toBe("Capo");
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

  it("lê payload completo da documentação (aplicacao, tipo_auto, eventos)", () => {
    const dados = {
      registro_debitos_por_infracoes_renainf: {
        infracoes_renainf: {
          possui_infracoes: "sim",
          infracoes: [
            {
              dados_infracao: {
                infracao:
                  "7455 - TRANSITAR EM ATE 20% ACIMA DA VELOCIDADE PERMITIDA",
                numero_auto_infracao: "R400009999",
                valor_aplicado: "130,16",
                orgao_autuador: "100 - POLICIA RODOVIARIA FEDERAL",
                tipo_auto_infracao: "2",
                local_infracao: "BR 163 KM 270 UF MS",
                municipio: "DOURADOS",
              },
              aplicacao: {
                unidade_medida: "KM/H",
                limite_permitido: "60,00",
                medicao_considerada: "0,00",
                medicao_real: "69,00",
              },
              eventos: {
                data_hora_infracao: "08/02/2019 ",
                data_cadastramento: "01/03/2019",
                data_notificacao: "",
                data_emissao_penalidade: "",
              },
            },
          ],
        },
      },
    };
    const out = parsearRenainfDossie(dados);
    expect(out.infracoes).toHaveLength(1);
    const i = out.infracoes[0];
    expect(i.tipo_auto_infracao).toBe("2");
    expect(i.aplicacao_unidade_medida).toBe("KM/H");
    expect(i.aplicacao_limite_permitido).toBe("60,00");
    expect(i.aplicacao_medicao_real).toBe("69,00");
    expect(i.aplicacao_medicao_considerada).toBe("0,00");
    expect(i.data_cadastramento).toBe("01/03/2019");
    expect(i.orgao_autuador).toContain("POLICIA");
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
  it("extrai agente, situação e veículo do registro (doc. oficial)", () => {
    const dados = {
      gravame: {
        possui_gravame: "sim",
        registro: {
          agente_financeiro: {
            cnpj: "90400888000142",
            nome: "BANCO SANTANDER SA",
          },
          data_registro: "07/07/2022",
          placa: "AAA0000",
          chassi: "00AAA00A00A000000",
          uf_placa: "SP",
          situacao: "CONSTA REGISTRO DE GRAVAME",
        },
      },
    };
    const out = parsearGravameDossie(dados);
    expect(out?.agente_financeiro_cnpj).toBe("90400888000142");
    expect(out?.agente_financeiro_nome).toBe("BANCO SANTANDER SA");
    expect(out?.situacao).toContain("GRAVAME");
    expect(out?.registro_placa).toBe("AAA0000");
    expect(out?.registro_chassi).toBe("00AAA00A00A000000");
    expect(out?.registro_uf_placa).toBe("SP");
  });
});

describe("roubo_furto: payload API oficial → persistência → laudo PDF", () => {
  it("preserva todos os registros do exemplo da documentação Consultar Placa", () => {
    const dados = {
      historico_roubo_furto: {
        registros_roubo_furto: {
          possui_registro: "sim",
          registros: [
            {
              boletim_ocorrencia: "9996",
              data_boletim_ocorrencia: "02/09/2019",
              tipo_ocorrencia: "Declaração de Roubo",
              uf_ocorrencia: "PR",
            },
            {
              boletim_ocorrencia: "9997",
              data_boletim_ocorrencia: "05/09/2019",
              tipo_ocorrencia: "Achado",
              uf_ocorrencia: "PR",
            },
            {
              boletim_ocorrencia: "9998",
              data_boletim_ocorrencia: "06/09/2019",
              tipo_ocorrencia: "Devolvido",
              uf_ocorrencia: "PR",
            },
          ],
        },
      },
    };
    const dossie = extrairDossieConsultaPremium("roubo_furto", dados);
    expect(dossie?.tipo).toBe("roubo_furto");
    if (dossie?.tipo !== "roubo_furto") return;
    expect(dossie.dados.registros).toHaveLength(3);

    const ser = serializarDossieParaPersistencia("roubo_furto", dossie);
    const back = dossieFromStoredBlock(ser);
    expect(back?.tipo).toBe("roubo_furto");
    if (back?.tipo !== "roubo_furto") return;
    expect(back.dados.registros).toHaveLength(3);
    expect(back.dados.registros[1].tipo_ocorrencia).toBe("Achado");

    const laudo = extrairLaudoTecnicoParaPdf({
      consultas_premium: {
        roubo_furto: { dossie: ser },
      },
    });
    expect(laudo.rouboLinhas).toHaveLength(3);
    expect(laudo.rouboLinhas[0]).toContain("9996");
    expect(laudo.rouboLinhas[0]).toContain("Declaração de Roubo");
    expect(laudo.rouboLinhas[2]).toContain("Devolvido");
  });
});

describe("gravame: payload API oficial → persistência → laudo PDF", () => {
  it("preserva placa/chassi/UF e agente no roundtrip", () => {
    const dados = {
      gravame: {
        possui_gravame: "sim",
        registro: {
          agente_financeiro: { cnpj: "90400888000142", nome: "BANCO SANTANDER SA" },
          data_registro: "07/07/2022",
          placa: "AAA0000",
          chassi: "00AAA00A00A000000",
          uf_placa: "SP",
          situacao: "CONSTA REGISTRO DE GRAVAME",
        },
      },
    };
    const dossie = extrairDossieConsultaPremium("gravame", dados);
    expect(dossie?.tipo).toBe("gravame");
    if (dossie?.tipo !== "gravame") return;
    expect(dossie.dados.registro_placa).toBe("AAA0000");

    const ser = serializarDossieParaPersistencia("gravame", dossie);
    const back = dossieFromStoredBlock(ser);
    expect(back?.tipo).toBe("gravame");
    if (back?.tipo !== "gravame") return;
    expect(back.dados.registro_chassi).toBe("00AAA00A00A000000");

    const laudo = extrairLaudoTecnicoParaPdf({
      consultas_premium: { gravame: { dossie: ser } },
    });
    expect(laudo.gravameLinhas.length).toBeGreaterThan(0);
    expect(laudo.gravameLinhas[0]).toContain("AAA0000");
    expect(laudo.gravameLinhas[0]).toContain("Chassi:");
  });
});

describe("sinistro: payload API oficial → persistência → laudo PDF", () => {
  it("extrai registro textual e roundtrip dossie", () => {
    const dados = {
      registro_sinistro_com_perda_total: {
        possui_registro: "sim",
        registro: "CONSTA INDENIZAÇÃO INTEGRAL",
      },
    };
    const dossie = extrairDossieConsultaPremium("sinistro", dados);
    expect(dossie?.tipo).toBe("sinistro");
    if (dossie?.tipo !== "sinistro") return;
    expect(dossie.dados.registro).toBe("CONSTA INDENIZAÇÃO INTEGRAL");

    const ser = serializarDossieParaPersistencia("sinistro", dossie);
    const back = dossieFromStoredBlock(ser);
    expect(back?.tipo).toBe("sinistro");
    if (back?.tipo !== "sinistro") return;
    expect(back.dados.registro).toBe("CONSTA INDENIZAÇÃO INTEGRAL");

    const laudo = extrairLaudoTecnicoParaPdf({
      consultas_premium: {
        sinistro: { dossie: ser },
      },
    });
    expect(laudo.sinistroLinhas).toHaveLength(1);
    expect(laudo.sinistroLinhas[0]).toContain("INDENIZAÇÃO");
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

  it("roundtrip leilao com campos opcionais (parecer, pecas IA, remarketing)", () => {
    const d = extrairDossieConsultaPremium("leilao", {
      informacoes_sobre_leilao: {
        registro_sobre_oferta: { classificacao: "A" },
        registro_leiloes: {
          registros: [
            {
              comitente: "Banco",
              lote: "1",
              data_leilao: "2020-01-01",
              placa: "ABC1D23",
            },
          ],
        },
        registro_sinistros_acidentes: { possui_registro: "sim" },
        parecer_tecnico: {
          parecer: "alerta",
          detalhes: { registro_frota_locadora: "sim" },
        },
      },
      informacoes_sobre_remarketing: {
        registros: [{ item: "1", organizador: "Y", data_evento: "2015-01-01" }],
      },
      informacoes_possiveis_danos_detectados_por_ia: {
        situacao_analise: "processando",
        possiveis_pecas_danificadas: [
          { descricao: "Para-choque", probabilidade: 50 },
        ],
      },
    });
    expect(d?.tipo).toBe("leilao");
    const ser = serializarDossieParaPersistencia("leilao", d);
    const back = dossieFromStoredBlock(ser);
    expect(back?.tipo).toBe("leilao");
    if (back?.tipo === "leilao") {
      expect(back.dados.registros[0].veiculo_placa).toBe("ABC1D23");
      expect(back.dados.sinistros_acidentes_possui_registro).toBe("sim");
      expect(back.dados.parecer_tecnico_parecer).toBe("alerta");
      expect(back.dados.parecer_tecnico_detalhes?.registro_frota_locadora).toBe(
        "sim"
      );
      expect(back.dados.remarketing_registros?.[0]?.organizador).toBe("Y");
      expect(back.dados.ia_situacao_analise).toBe("processando");
      expect(back.dados.ia_pecas_danificadas?.[0]?.probabilidade).toBe("50%");
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
            registro_placa: "ABC1D23",
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
    expect(laudo.gravameLinhas.some((l) => l.includes("ABC1D23"))).toBe(true);
    expect(laudo.renainfLinhas.some((l) => l.includes("Auto: A99"))).toBe(
      true
    );
  });

  it("inclui Leilao Prime no laudo (registro expandido, parecer, remarketing, pecas IA)", () => {
    const dadosLeilao = {
      consultas_premium: {
        leilao: {
          dossie: {
            kind: "leilao_prime",
            classificacao_letra: "C",
            classificacao_titulo: "Titulo API",
            classificacao_descricao: "",
            registros: [
              {
                comitente: "Seg",
                lote: "9",
                data_leilao: "2021-11-09",
                veiculo_placa: "ABC1234",
              },
            ],
            ia_danos: [],
            fotos_remarketing: [],
            imagens_ia: [],
            sinistros_acidentes_possui_registro: "nao",
            parecer_tecnico_parecer: "favoravel",
            parecer_tecnico_detalhes: {
              registro_veiculo_importado: "nao",
            },
            ia_situacao_analise: "concluido",
            ia_pecas_danificadas: [
              { descricao: "Capo", probabilidade: "80%" },
            ],
            remarketing_registros: [
              {
                item: "26",
                organizador: "Org",
                data_evento: "2016-11-16",
                condicao_geral_veiculo: "",
                condicao_motor: "",
                condicao_cambio: "",
              },
            ],
          },
        },
      },
    };
    const laudo = extrairLaudoTecnicoParaPdf(dadosLeilao);
    const joined = laudo.leilaoParagrafos.join(" ");
    expect(joined).toMatch(/ABC1234/);
    expect(joined).toMatch(/Parecer técnico/);
    expect(joined).toMatch(/Peças com indício/);
    expect(joined).toMatch(/Remarketing/);
    expect(joined).toMatch(/veiculo importado/i);
  });
});

describe("tituloClassificacaoLeilaoPrime", () => {
  it("retorna texto para C", () => {
    expect(tituloClassificacaoLeilaoPrime("C")).toContain("seguradora");
  });
});
