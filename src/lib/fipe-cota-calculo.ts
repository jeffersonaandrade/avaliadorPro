/**
 * Regras puras de cota FIPE mensal (sem Supabase / server-only).
 * Usado em Server Actions e em testes unitários.
 */
export type FipeCotaGateSnapshot = {
  plano_ativo: boolean;
  consultas_fipe_utilizadas: number;
  consultas_fipe_limite: number;
};

export function consultasFipeRestantes(u: FipeCotaGateSnapshot): number {
  if (!u.plano_ativo || u.consultas_fipe_limite <= 0) return 0;
  return Math.max(0, u.consultas_fipe_limite - u.consultas_fipe_utilizadas);
}

export function podeUsarConsultaFipe(u: FipeCotaGateSnapshot): boolean {
  if (!u.plano_ativo) return false;
  if (u.consultas_fipe_limite <= 0) return false;
  return u.consultas_fipe_utilizadas < u.consultas_fipe_limite;
}

/** Gate explícito antes de chamar a resolução FIPE (custo variável). */
export function podeConsumirFipe(u: FipeCotaGateSnapshot): boolean {
  return podeUsarConsultaFipe(u);
}
