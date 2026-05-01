/**
 * Regra pura: após downgrade de plano, cota FIPE **inclusa** não pode exceder o novo teto.
 * Evita saldo negativo de “restantes” e estados inconsistentes.
 */
export function clampConsultasFipePosDowngrade(
  utilizadas: number,
  novoLimiteIncluso: number
): number {
  const u = Math.max(0, Math.floor(Number(utilizadas) || 0));
  const lim = Math.max(0, Math.floor(Number(novoLimiteIncluso) || 0));
  return Math.min(u, lim);
}
