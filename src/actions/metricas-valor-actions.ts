"use server";

import { obterSomaValorEvitarPerdaMesUtc } from "@/lib/consulta-audit-supabase";
import { isPublicDemoMocksMode, MOCK_DEMO_USER_ID } from "@/lib/demo-mocks";

/**
 * Soma `valor_evitar_perda` do mês civil UTC (apenas eventos `CREDITO_CONSUMIDO`).
 */
export async function obterValorProtegidoMesAction(
  identificadorCliente: string
): Promise<{ totalReais: number }> {
  const id =
    (identificadorCliente ?? "").trim() ||
    (isPublicDemoMocksMode() ? MOCK_DEMO_USER_ID : "");
  if (!id) return { totalReais: 0 };
  const totalReais = await obterSomaValorEvitarPerdaMesUtc(id);
  return { totalReais };
}
