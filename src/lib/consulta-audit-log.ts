import { randomUUID } from "node:crypto";

import { envNextPublicUseMocksAtivo } from "@/lib/demo-mocks";

export type StatusDebitoAuditoria =
  | "debitado_ok"
  | "debito_falhou"
  | "nao_aplicavel_cache"
  | "nao_aplicavel_mock";

export type TipoEventoAuditoria =
  | "consulta_premium_api"
  | "uso_cache_premium"
  | "uso_cache_basico";

export type LinhaAuditoriaConsulta = {
  id: string;
  quandoIso: string;
  usuarioId: string;
  placa: string;
  /** Custo estimado da API em BRL (0 em cache). */
  custoRealReais: number;
  statusDebito: StatusDebitoAuditoria;
  tipo: TipoEventoAuditoria;
  detalhe?: string;
  /** Modo mock ativo: linha não entra em KPIs “orgânicos” do admin. */
  origemSandbox?: boolean;
};

const MAX = 200;
const buffer: LinhaAuditoriaConsulta[] = [];

const CUSTO_API_PREMIUM_REAIS = 16;

export function getCustoUnitarioPremiumReais(): number {
  return CUSTO_API_PREMIUM_REAIS;
}

export function registrarEventoAuditoriaConsulta(
  entrada: Omit<LinhaAuditoriaConsulta, "id" | "quandoIso"> & {
    quandoIso?: string;
  }
): void {
  const linha: LinhaAuditoriaConsulta = {
    id: randomUUID(),
    quandoIso: entrada.quandoIso ?? new Date().toISOString(),
    usuarioId: entrada.usuarioId,
    placa: entrada.placa,
    custoRealReais: entrada.custoRealReais,
    statusDebito: entrada.statusDebito,
    tipo: entrada.tipo,
    detalhe: entrada.detalhe,
    ...(envNextPublicUseMocksAtivo() ? { origemSandbox: true as const } : {}),
  };
  buffer.unshift(linha);
  while (buffer.length > MAX) buffer.pop();
}

export function obterUltimasAuditoriasConsulta(limite: number): LinhaAuditoriaConsulta[] {
  const organicas = buffer.filter((l) => !l.origemSandbox);
  return organicas.slice(0, Math.max(0, limite));
}

/** Preço de venda assumido por consulta premium debitada (auditoria / KPI aproximado). */
const PRECO_CONSULTA_PREMIUM_VENDA_REAIS = 57.25;

export function computarKpisResumoAuditoria(): {
  faturamentoBrutoReais: number;
  custoTotalApiReais: number;
  lucroLiquidoReais: number;
  volumeConsultas: number;
} {
  const linhas = buffer.filter((l) => !l.origemSandbox);
  const volumeConsultas = linhas.length;
  let cobrancaPorDebito = 0;
  let custoTotalApiReais = 0;
  for (const l of linhas) {
    custoTotalApiReais += l.custoRealReais;
    if (
      l.tipo === "consulta_premium_api" &&
      l.statusDebito === "debitado_ok"
    ) {
      cobrancaPorDebito += PRECO_CONSULTA_PREMIUM_VENDA_REAIS;
    }
  }
  const faturamentoBrutoReais = cobrancaPorDebito;
  const lucroLiquidoReais = faturamentoBrutoReais - custoTotalApiReais;
  return {
    faturamentoBrutoReais,
    custoTotalApiReais,
    lucroLiquidoReais,
    volumeConsultas,
  };
}

export function contarEventosPorTipo(tipo: TipoEventoAuditoria): number {
  return buffer.filter((b) => b.tipo === tipo).length;
}

export function resetConsultaAuditLogForTests(): void {
  buffer.length = 0;
}
