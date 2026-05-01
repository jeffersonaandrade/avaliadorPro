/**
 * Formatação monetária para UI/PDF comercial: pt-BR, sempre 2 decimais.
 * Separado de `viabilidade.ts` para não tocar no motor de cálculo.
 */
export function formatarMoedaBRLExibicao(valor: number): string {
  if (!Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}
