"use server";

import {
  obterResumoRoiConfiabilidadeMesUtc,
  obterSomaValorEvitarPerdaMesUtc,
} from "@/lib/consulta-audit-supabase";
import { mockResumoRoiConfiabilidadeMes } from "@/lib/admin-mocks";
import { isPublicDemoMocksMode, MOCK_DEMO_USER_ID } from "@/lib/demo-mocks";
import type { ResumoRoiConfiabilidade } from "@/lib/reconciliacao-auditoria";

/**
 * Soma `valor_evitar_perda` do mês civil UTC só em `CREDITO_CONSUMIDO` com persistência confirmada (ROI confiável).
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

/** ROI confiável vs suspeito no mês UTC (todos os clientes) — admin / reconciliação. */
export async function obterResumoRoiConfiabilidadeAction(): Promise<ResumoRoiConfiabilidade> {
  if (isPublicDemoMocksMode()) return mockResumoRoiConfiabilidadeMes();
  return obterResumoRoiConfiabilidadeMesUtc();
}
