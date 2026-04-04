/**
 * Teto único para `fetch` a APIs externas no servidor (`AbortController`).
 * Netlify Free: ~10s por função — margem para persistência, retries e overhead.
 */
export const FETCH_TIMEOUT_MS_EXTERNAL = 8_000;
