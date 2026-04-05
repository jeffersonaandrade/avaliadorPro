/**
 * Teto padrão para `fetch` a APIs externas no servidor (`AbortController`).
 * Netlify Free: ~10s por função — margem para persistência, retries e overhead.
 */
export const FETCH_TIMEOUT_MS_EXTERNAL = 8_000;

/**
 * Renainf e Leilão Prime: em Netlify Free (~10s por função) usamos o mesmo teto de 8s
 * que o restante das chamadas externas. Em ambientes com funções longas, aumente via fork/env.
 */
export const FETCH_TIMEOUT_MS_RENAINF = FETCH_TIMEOUT_MS_EXTERNAL;
export const FETCH_TIMEOUT_MS_LEILAO_PRIME = FETCH_TIMEOUT_MS_EXTERNAL;
