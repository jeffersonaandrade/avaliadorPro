/**
 * Modo demonstração pública (`NEXT_PUBLIC_USE_MOCKS=true`):
 * painel sem login, APIs simuladas, sem débito real em `usuario_acesso`.
 *
 * Consultas premium: com `API_CONSULTAR_PLACA_TOKEN` definido, o app chama a API
 * real (ver `isSandboxMocksPremiumEnabled` em `consultar-placa-premium-v2.ts`).
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

export function isPublicDemoMocksMode(): boolean {
  return (
    String(process.env.NEXT_PUBLIC_USE_MOCKS ?? "").trim().toLowerCase() ===
    "true"
  );
}
