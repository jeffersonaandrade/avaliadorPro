/** Lógica pura da retenção (testável sem `server-only` / Supabase). */

export type ResultadoRetencaoAuditoria = {
  ok: true;
  sourceDistinctGroups: number;
  upsertRowCount: number;
  deletedInicioCache30d: number;
  deletedAll90d: number;
};

export function detectarSilentPurgeNaAgregacao(
  sourceDistinctGroups: number,
  upsertRowCount: number
): boolean {
  return sourceDistinctGroups > 0 && upsertRowCount === 0;
}

export function parseResultadoRetencaoRpc(data: unknown): ResultadoRetencaoAuditoria {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Resposta RPC inválida: esperado objeto JSON.");
  }
  const o = data as Record<string, unknown>;
  if (o.ok !== true) {
    throw new Error("Resposta RPC sem ok=true.");
  }
  const num = (k: string) => {
    const v = o[k];
    return typeof v === "number" && Number.isFinite(v) ? v : NaN;
  };
  const sourceDistinctGroups = num("source_distinct_groups");
  const upsertRowCount = num("upsert_row_count");
  const deletedInicioCache30d = num("deleted_inicio_cache_30d");
  const deletedAll90d = num("deleted_all_90d");
  if (
    !Number.isFinite(sourceDistinctGroups) ||
    !Number.isFinite(upsertRowCount) ||
    !Number.isFinite(deletedInicioCache30d) ||
    !Number.isFinite(deletedAll90d)
  ) {
    throw new Error("Resposta RPC com campos numéricos inválidos.");
  }
  if (detectarSilentPurgeNaAgregacao(sourceDistinctGroups, upsertRowCount)) {
    throw new Error(
      "Silent purge detectado: origem com grupos mas upsert sem linhas afetadas."
    );
  }
  return {
    ok: true,
    sourceDistinctGroups,
    upsertRowCount,
    deletedInicioCache30d,
    deletedAll90d,
  };
}
