import "server-only";

import { envNextPublicUseMocksAtivo } from "@/lib/demo-mocks";

export const AMBIENTE_ORIGEM_MOCK = "mock_development" as const;

/**
 * Colunas em `consultas_veiculos` e `consultas_auditoria_eventos` para separar PRD de sandbox.
 * Única fonte de verdade: `NEXT_PUBLIC_USE_MOCKS === "true"` (via `envNextPublicUseMocksAtivo`).
 */
export function colunasSandboxDbRow(): {
  is_sandbox: boolean;
  ambiente_origem: string | null;
} {
  if (envNextPublicUseMocksAtivo()) {
    return { is_sandbox: true, ambiente_origem: AMBIENTE_ORIGEM_MOCK };
  }
  return { is_sandbox: false, ambiente_origem: null };
}

/** Metadados redundantes em `dados_leilao` (JSON) para leituras que não fazem SELECT das colunas. */
export function marcacoesSandboxEmDadosLeilaoJson(): Record<string, unknown> {
  const c = colunasSandboxDbRow();
  return {
    is_sandbox: c.is_sandbox,
    ambiente_origem: c.ambiente_origem,
  };
}

/**
 * Filtro PostgREST: eventos orgânicos (exclui sandbox da reconciliação / ROI).
 * Linhas antigas sem coluna tratam-se como orgânicas (`is.null`).
 */
export const FILTRO_AUDITORIA_APENAS_ORGANICO =
  "is_sandbox.is.null,is_sandbox.eq.false" as const;
