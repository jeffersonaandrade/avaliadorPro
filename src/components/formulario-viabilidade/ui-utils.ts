/** Tom “muted” alinhado a text-muted-foreground (Tailwind: slate-500). */
export const legendaCls = "text-xs leading-snug text-slate-500";

export function arredondarReais2Ui(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatarPctParaCampo(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (n % 1 === 0) return String(n);
  return n.toFixed(1).replace(".", ",");
}
