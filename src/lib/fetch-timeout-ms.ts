/**
 * Teto padrão para `fetch` a APIs externas no servidor (`AbortController`).
 * Netlify Free: ~10s por função — margem para persistência, retries e overhead.
 */
export const FETCH_TIMEOUT_MS_EXTERNAL = 8_000;

/**
 * Renainf: mesmo teto que o restante (8s). Em ambientes com funções longas, ajuste via fork/env.
 */
export const FETCH_TIMEOUT_MS_RENAINF = FETCH_TIMEOUT_MS_EXTERNAL;

function timeoutMsFromEnv(name: string): number | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Leilão Prime: o provedor recomenda timeout ≥ **300s** quando há processamento de imagens.
 * Padrão 8s (alinhado a Netlify Free). Em servidor próprio / função longa, defina
 * `LEILAO_PRIME_FETCH_TIMEOUT_MS` (milissegundos), ex.: `300000` para 5 minutos.
 */
export const FETCH_TIMEOUT_MS_LEILAO_PRIME =
  timeoutMsFromEnv("LEILAO_PRIME_FETCH_TIMEOUT_MS") ??
  FETCH_TIMEOUT_MS_EXTERNAL;
