import { z } from "zod";

/**
 * Regex de placa brasileira:
 * - Formato antigo: 3 letras + 4 dígitos (ex.: ABC1234)
 * - Mercosul: 3 letras + dígito + letra + 2 dígitos (ex.: ABC1D23)
 */
const PLACA_BR_REGEX = /^(?:[A-Z]{3}\d{4}|[A-Z]{3}\d[A-Z]\d{2})$/;

/** Normaliza entrada: remove espaços/hífens e aplica caixa alta antes da validação. */
export function normalizarPlacaInput(value: string): string {
  return value.trim().replace(/[\s-]/g, "").toUpperCase();
}

export const placaSchema = z
  .string()
  .transform((s) => normalizarPlacaInput(s))
  .pipe(
    z.string().regex(
      PLACA_BR_REGEX,
      "Formato inválido. Use ABC1234 (antigo) ou ABC1D23 (Mercosul)."
    )
  );

export type PlacaValidada = z.infer<typeof placaSchema>;
