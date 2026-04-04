"use server";

import { isPublicDemoMocksMode } from "@/lib/demo-mocks";
import {
  carregarUsuarioAcesso,
  mesReferenciaUtcAtual,
  normalizarMesContadorFipe,
} from "@/lib/usuario-acesso";

export type EstadoAcessoCliente = {
  planoAtivo: boolean;
  creditosPremium: number;
  consultasFipeUsadas: number;
  consultasFipeLimite: number;
  fipeMesReferencia: string;
  identificadorValido: boolean;
};

/**
 * Estado para badge, overlay e exibição de créditos (sem expor dados sensíveis).
 */
export async function getEstadoAcessoAction(
  identificadorCliente: string
): Promise<EstadoAcessoCliente> {
  const id = (identificadorCliente ?? "").trim();
  if (!id && !isPublicDemoMocksMode()) {
    return {
      planoAtivo: false,
      creditosPremium: 0,
      consultasFipeUsadas: 0,
      consultasFipeLimite: 0,
      fipeMesReferencia: mesReferenciaUtcAtual(),
      identificadorValido: false,
    };
  }

  const row = await carregarUsuarioAcesso(identificadorCliente ?? "");
  if (!row) {
    return {
      planoAtivo: false,
      creditosPremium: 0,
      consultasFipeUsadas: 0,
      consultasFipeLimite: 0,
      fipeMesReferencia: mesReferenciaUtcAtual(),
      identificadorValido: true,
    };
  }

  const n = await normalizarMesContadorFipe(row);
  return {
    planoAtivo: n.plano_ativo,
    creditosPremium: n.creditos_premium,
    consultasFipeUsadas: n.consultas_fipe_utilizadas,
    consultasFipeLimite: n.consultas_fipe_limite,
    fipeMesReferencia: n.fipe_mes_referencia,
    identificadorValido: true,
  };
}
