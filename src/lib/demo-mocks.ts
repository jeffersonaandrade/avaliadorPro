/**
 * Modo demonstração pública (`NEXT_PUBLIC_USE_MOCKS=true`):
 * painel sem login, APIs simuladas, sem débito real em `usuario_acesso`.
 *
 * Consultas premium: com Bearer (`API_CONSULTAR_PLACA_TOKEN`) ou Basic
 * (`CONSULTAR_PLACA_API_EMAIL` + `CONSULTAR_PLACA_API_KEY`), o app chama a v2 real
 * (ver `isSandboxMocksPremiumEnabled` em `consultar-placa-premium-v2.ts`).
 */

export const MOCK_DEMO_USER_ID = "demo-user" as const;

/** Referência de UX / documentação — espelhada em `usuarioDemoAcessoRow` (usuario-acesso). */
export const mockUserAcesso = {
  plano: "Premium",
  fipe_limite: 999,
  fipe_usado: 0,
  creditos_premium: 999,
  user_id: MOCK_DEMO_USER_ID,
} as const;

/**
 * Valor exato `true` (minúsculo), igual ao `.env` típico `NEXT_PUBLIC_USE_MOCKS=true`.
 * Usado para modo demo, mock premium sem credencial e interceptação de placa na API Consultar Placa.
 */
export function envNextPublicUseMocksAtivo(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCKS === "true";
}

export function isPublicDemoMocksMode(): boolean {
  return envNextPublicUseMocksAtivo();
}
