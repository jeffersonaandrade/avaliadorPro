"use server";

import { obterResumoAssinaturaParaUi } from "@/lib/assinaturas";
import { isPublicDemoMocksMode } from "@/lib/demo-mocks";
import {
  carregarUsuarioAcesso,
  consultasFipeRestantes,
  mesReferenciaUtcAtual,
  normalizarMesContadorFipe,
} from "@/lib/usuario-acesso";

export type StatusAssinaturaUi =
  | "ativo"
  | "pendente"
  | "expirado"
  | "cancelado"
  | null;

export type EstadoAcessoCliente = {
  planoAtivo: boolean;
  planoSlug: string | null;
  /** Vigência quando há registro em `assinaturas` (ou demo). */
  statusAssinatura: StatusAssinaturaUi;
  dataExpiracaoAssinaturaIso: string | null;
  creditosPremium: number;
  consultasFipeUsadas: number;
  consultasFipeLimite: number;
  consultasFipeRestantes: number;
  /** Consultas FIPE além da cota no mês civil UTC atual. */
  consultasFipeExcedentes: number;
  /** Soma R$ debitados do saldo pré-pago no mês (zera na virada UTC). */
  valorTotalExcedenteReais: number;
  /** Saldo R$ para consultas FIPE além da cota mensal. */
  saldoPrePagoReais: number;
  fipeMesReferencia: string;
  identificadorValido: boolean;
  /** `true` se `AVALIADOR_PERMITIR_COMPRA_CREDITO_DIRETA=true` no servidor. */
  compraCreditosDiretaHabilitada: boolean;
};

/**
 * Estado para badge, overlay e exibição de créditos (sem expor dados sensíveis).
 */
export async function getEstadoAcessoAction(
  identificadorCliente: string
): Promise<EstadoAcessoCliente> {
  const id = (identificadorCliente ?? "").trim();
  const compraDir =
    String(process.env.AVALIADOR_PERMITIR_COMPRA_CREDITO_DIRETA ?? "")
      .trim()
      .toLowerCase() === "true";

  if (!id && !isPublicDemoMocksMode()) {
    return {
      planoAtivo: false,
      planoSlug: null,
      statusAssinatura: null,
      dataExpiracaoAssinaturaIso: null,
      creditosPremium: 0,
      consultasFipeUsadas: 0,
      consultasFipeLimite: 0,
      consultasFipeRestantes: 0,
      consultasFipeExcedentes: 0,
      valorTotalExcedenteReais: 0,
      saldoPrePagoReais: 0,
      fipeMesReferencia: mesReferenciaUtcAtual(),
      identificadorValido: false,
      compraCreditosDiretaHabilitada: compraDir,
    };
  }

  const row = await carregarUsuarioAcesso(identificadorCliente ?? "");
  if (!row) {
    return {
      planoAtivo: false,
      planoSlug: null,
      statusAssinatura: null,
      dataExpiracaoAssinaturaIso: null,
      creditosPremium: 0,
      consultasFipeUsadas: 0,
      consultasFipeLimite: 0,
      consultasFipeRestantes: 0,
      consultasFipeExcedentes: 0,
      valorTotalExcedenteReais: 0,
      saldoPrePagoReais: 0,
      fipeMesReferencia: mesReferenciaUtcAtual(),
      identificadorValido: true,
      compraCreditosDiretaHabilitada: compraDir,
    };
  }

  const n = await normalizarMesContadorFipe(row);

  let statusAssinatura: StatusAssinaturaUi = null;
  let dataExpiracaoAssinaturaIso: string | null = null;

  if (isPublicDemoMocksMode()) {
    const fim = new Date();
    fim.setUTCFullYear(fim.getUTCFullYear() + 1);
    statusAssinatura = "ativo";
    dataExpiracaoAssinaturaIso = fim.toISOString();
  } else {
    const resumo = await obterResumoAssinaturaParaUi(id);
    if (resumo.temAssinatura) {
      statusAssinatura = resumo.status;
      dataExpiracaoAssinaturaIso = resumo.dataExpiracao;
    }
  }

  return {
    planoAtivo: n.plano_ativo,
    planoSlug: n.plano,
    statusAssinatura,
    dataExpiracaoAssinaturaIso,
    creditosPremium: n.creditos_premium,
    consultasFipeUsadas: n.consultas_fipe_utilizadas,
    consultasFipeLimite: n.consultas_fipe_limite,
    consultasFipeRestantes: consultasFipeRestantes(n),
    consultasFipeExcedentes: n.consultas_excedentes,
    valorTotalExcedenteReais: n.valor_total_excedente,
    saldoPrePagoReais: n.saldo_pre_pago,
    fipeMesReferencia: n.fipe_mes_referencia,
    identificadorValido: true,
    compraCreditosDiretaHabilitada: compraDir,
  };
}
