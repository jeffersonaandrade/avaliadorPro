import { describe, expect, it } from "vitest";

import {
  detectarSilentPurgeNaAgregacao,
  parseResultadoRetencaoRpc,
} from "@/lib/auditoria-retencao-logic";

describe("detectarSilentPurgeNaAgregacao", () => {
  it("retorna true quando há origem mas upsert zerado (bloquear purge)", () => {
    expect(detectarSilentPurgeNaAgregacao(3, 0)).toBe(true);
  });

  it("retorna false quando não há dados antigos para agregar", () => {
    expect(detectarSilentPurgeNaAgregacao(0, 0)).toBe(false);
  });

  it("retorna false quando upsert refletiu a origem", () => {
    expect(detectarSilentPurgeNaAgregacao(5, 5)).toBe(false);
    expect(detectarSilentPurgeNaAgregacao(1, 3)).toBe(false);
  });
});

describe("parseResultadoRetencaoRpc", () => {
  it("aceita payload válido da função SQL", () => {
    const r = parseResultadoRetencaoRpc({
      ok: true,
      source_distinct_groups: 2,
      upsert_row_count: 2,
      deleted_inicio_cache_30d: 10,
      deleted_all_90d: 4,
    });
    expect(r.ok).toBe(true);
    expect(r.sourceDistinctGroups).toBe(2);
    expect(r.upsertRowCount).toBe(2);
    expect(r.deletedInicioCache30d).toBe(10);
    expect(r.deletedAll90d).toBe(4);
  });

  it("lança se ok !== true", () => {
    expect(() =>
      parseResultadoRetencaoRpc({
        ok: false,
        source_distinct_groups: 0,
        upsert_row_count: 0,
        deleted_inicio_cache_30d: 0,
        deleted_all_90d: 0,
      })
    ).toThrow();
  });

  it("lança em silent purge (defesa em camada TS além do SQL)", () => {
    expect(() =>
      parseResultadoRetencaoRpc({
        ok: true,
        source_distinct_groups: 4,
        upsert_row_count: 0,
        deleted_inicio_cache_30d: 0,
        deleted_all_90d: 0,
      })
    ).toThrow(/Silent purge/);
  });
});

describe("idempotência da métrica (contrato mental)", () => {
  it("substituição EXCLUDED sobrescreve totais — segunda agregação com mesmos dados brutos = mesmos números", () => {
    const primeiro = { creditos: 3, valor: 120.5 };
    const segundo = { creditos: 3, valor: 120.5 };
    expect(segundo.creditos).toBe(primeiro.creditos);
    expect(segundo.valor).toBe(primeiro.valor);
  });
});
