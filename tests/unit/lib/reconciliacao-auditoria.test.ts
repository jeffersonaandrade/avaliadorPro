import { describe, expect, it, vi } from "vitest";

import {
  acumularResumoRoiCreditoPorLinhas,
  agregarPorCliente,
  agruparEventosEmTransacoes,
  calcularKpisConciliacao,
  creditoConsumidoRoiSuspeito,
  type LinhaEventoAuditoriaDb,
} from "@/lib/reconciliacao-auditoria";

function linha(
  overrides: Partial<LinhaEventoAuditoriaDb> & Pick<LinhaEventoAuditoriaDb, "evento">
): LinhaEventoAuditoriaDb {
  return {
    id: crypto.randomUUID(),
    criado_em: new Date().toISOString(),
    cliente_id: "c1",
    placa: "ABC1D23",
    tipo_consulta: "leilao",
    detalhe: null,
    valor_evitar_perda: null,
    tipo_risco_detectado: null,
    request_id: null,
    ...overrides,
  };
}

describe("calcularKpisConciliacao", () => {
  it("calcula taxa e alerta quando D > C", () => {
    const k = calcularKpisConciliacao({
      CONSULTA_SUCESSO: 10,
      CREDITO_CONSUMIDO: 12,
      CONSULTA_ERRO: 2,
      CONSULTA_TIMEOUT: 1,
    });
    expect(k.cSucesso).toBe(10);
    expect(k.dDebito).toBe(12);
    expect(k.eFalha).toBe(3);
    expect(k.taxaSucessoPct).toBe(76.9);
    expect(k.alertaDebitoMaiorQueSucesso).toBe(true);
  });

  it("sem alerta quando D <= C", () => {
    const k = calcularKpisConciliacao({
      CONSULTA_SUCESSO: 20,
      CREDITO_CONSUMIDO: 18,
      CONSULTA_ERRO: 0,
      CONSULTA_TIMEOUT: 0,
    });
    expect(k.alertaDebitoMaiorQueSucesso).toBe(false);
  });
});

describe("agruparEventosEmTransacoes", () => {
  it("classifica fluxo saudável com request_id", () => {
    const rid = "req-1";
    const t0 = Date.now();
    const linhas: LinhaEventoAuditoriaDb[] = [
      linha({
        evento: "CONSULTA_INICIO",
        criado_em: new Date(t0).toISOString(),
        request_id: rid,
      }),
      linha({
        evento: "CONSULTA_SUCESSO",
        criado_em: new Date(t0 + 2000).toISOString(),
        request_id: rid,
      }),
      linha({
        evento: "CREDITO_CONSUMIDO",
        criado_em: new Date(t0 + 3000).toISOString(),
        request_id: rid,
      }),
    ];
    const g = agruparEventosEmTransacoes(linhas);
    expect(g).toHaveLength(1);
    expect(g[0]?.classificacao).toBe("saudavel");
  });

  it("crédito sem sucesso = inconsistente", () => {
    const linhas: LinhaEventoAuditoriaDb[] = [
      linha({
        evento: "CONSULTA_INICIO",
        criado_em: "2026-01-01T12:00:00.000Z",
        request_id: "r2",
      }),
      linha({
        evento: "CREDITO_CONSUMIDO",
        criado_em: "2026-01-01T12:00:05.000Z",
        request_id: "r2",
      }),
    ];
    const g = agruparEventosEmTransacoes(linhas);
    expect(g[0]?.classificacao).toBe("inconsistente_credito_sem_sucesso");
  });

  it("marca abandonada após 60s sem fechamento", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T13:02:00.000Z"));
    const linhas: LinhaEventoAuditoriaDb[] = [
      linha({
        evento: "CONSULTA_INICIO",
        criado_em: "2026-01-01T13:00:00.000Z",
        request_id: "ab",
      }),
    ];
    const g = agruparEventosEmTransacoes(linhas);
    expect(g[0]?.classificacao).toBe("abandonada");
    vi.useRealTimers();
  });
});

describe("agregarPorCliente", () => {
  it("soma créditos, sucessos, falhas e valor_evitar_perda", () => {
    const linhas: LinhaEventoAuditoriaDb[] = [
      linha({ evento: "CREDITO_CONSUMIDO", valor_evitar_perda: 10.5 }),
      linha({ evento: "CONSULTA_SUCESSO" }),
      linha({ evento: "CONSULTA_ERRO" }),
      linha({ evento: "CONSULTA_INICIO" }),
    ];
    const agg = agregarPorCliente(linhas);
    expect(agg).toHaveLength(1);
    expect(agg[0]?.creditosConsumidos).toBe(1);
    expect(agg[0]?.consultasSucesso).toBe(1);
    expect(agg[0]?.falhas).toBe(1);
    expect(agg[0]?.inicios).toBe(1);
    expect(agg[0]?.somaValorEvitarPerda).toBe(10.5);
  });

  it("não soma valor_evitar_perda em CREDITO_CONSUMIDO suspeito", () => {
    const linhas: LinhaEventoAuditoriaDb[] = [
      linha({ evento: "CREDITO_CONSUMIDO", valor_evitar_perda: 100 }),
      linha({
        evento: "CREDITO_CONSUMIDO",
        valor_evitar_perda: 999,
        persistencia_falhou_apos_debito: true,
      }),
    ];
    const agg = agregarPorCliente(linhas);
    expect(agg[0]?.creditosConsumidos).toBe(2);
    expect(agg[0]?.somaValorEvitarPerda).toBe(100);
  });
});

describe("creditoConsumidoRoiSuspeito", () => {
  it("válido quando flags false e detalhe limpo", () => {
    expect(
      creditoConsumidoRoiSuspeito({
        detalhe: "debito_1_credito_pos_api",
        persistencia_falhou_apos_debito: false,
        blindagem_persistencia_falhou_apos_debito: false,
      })
    ).toBe(false);
  });

  it("suspeito com persistencia_falhou_apos_debito true", () => {
    expect(
      creditoConsumidoRoiSuspeito({
        detalhe: null,
        persistencia_falhou_apos_debito: true,
      })
    ).toBe(true);
  });

  it("suspeito com blindagem_persistencia_falhou_apos_debito true", () => {
    expect(
      creditoConsumidoRoiSuspeito({
        detalhe: null,
        blindagem_persistencia_falhou_apos_debito: true,
      })
    ).toBe(true);
  });

  it("suspeito quando detalhe contém marcador legado", () => {
    expect(
      creditoConsumidoRoiSuspeito({
        detalhe: "erro persistencia_falhou_apos_debito retry",
      })
    ).toBe(true);
  });
});

describe("acumularResumoRoiCreditoPorLinhas", () => {
  it("separa somas e contagens válido vs suspeito", () => {
    const r = acumularResumoRoiCreditoPorLinhas([
      {
        valor_evitar_perda: 100,
        detalhe: "ok",
        persistencia_falhou_apos_debito: false,
      },
      {
        valor_evitar_perda: 50,
        detalhe: null,
        persistencia_falhou_apos_debito: true,
      },
      {
        valor_evitar_perda: 25.5,
        detalhe: "x blindagem_persistencia_falhou_apos_debito",
      },
    ]);
    expect(r.valor_total_protegido_valido).toBe(100);
    expect(r.valor_total_protegido_suspeito).toBe(75.5);
    expect(r.total_consultas_validas).toBe(1);
    expect(r.total_consultas_suspeitas).toBe(2);
  });
});
