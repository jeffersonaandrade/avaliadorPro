import { isPublicDemoMocksMode } from "@/lib/demo-mocks";
import { podeUsarConsultaFipe } from "@/lib/fipe-cota-calculo";
import { calcularPrecoExcedente } from "@/lib/planos-marketing";
import type {
  ResultadoRegistroConsumoFipe,
  UsuarioAcessoRow,
} from "@/lib/usuario-acesso";
import {
  debitarCreditoPremium,
  registrarConsumoFipePosMatch,
} from "@/lib/usuario-acesso";

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function bypassConsumoFinanceiro(): boolean {
  return (
    String(process.env.AVALIADOR_DEV_ACESSO_TOTAL ?? "")
      .trim()
      .toLowerCase() === "true" || isPublicDemoMocksMode()
  );
}

/**
 * Blindagem / APIs premium: exige plano ativo e saldo (exc. dev total ou demo pública).
 * Usar **antes** de qualquer chamada externa cara.
 */
export function podeConsumirBlindagem(user: UsuarioAcessoRow): boolean {
  if (bypassConsumoFinanceiro()) return true;
  return user.plano_ativo && user.creditos_premium >= 1;
}

/**
 * Debita 1 crédito premium após sucesso da operação (API já validada).
 * Eventos `CREDITO_CONSUMIDO` com contexto ficam nas server actions.
 */
export async function consumirBlindagem(
  identificador: string
): Promise<boolean> {
  return debitarCreditoPremium(identificador);
}

export type OpcoesRegistrarConsultaFipe = {
  placa: string;
  requestId?: string | null;
};

/**
 * Após match FIPE + persistência: consome cota inclusa ou registra excedente monetizado.
 */
export async function registrarConsultaFipe(
  identificador: string,
  opts: OpcoesRegistrarConsultaFipe
): Promise<ResultadoRegistroConsumoFipe> {
  return registrarConsumoFipePosMatch(identificador, opts);
}

/** Preço R$ por consulta FIPE após esgotar a cota mensal (slug do plano). */
export function calcularCustoExcedente(
  plano: string | null | undefined
): number {
  return calcularPrecoExcedente(plano);
}

/**
 * Verifica se há saldo pré-pago suficiente para uma consulta FIPE excedente.
 * Não altera o banco — use após registrar consumo bem-sucedido.
 */
export function consumirExcedenteFipe(
  user: UsuarioAcessoRow,
  plano: string | null | undefined
): { permitido: boolean; custoReais: number; saldoAtual: number } {
  const custo = calcularCustoExcedente(plano ?? user.plano);
  const saldo = roundMoney2(user.saldo_pre_pago);
  return {
    permitido: saldo >= custo,
    custoReais: custo,
    saldoAtual: saldo,
  };
}

/**
 * Antes de `resolverPrecoFipe`: cota inclusa **ou** saldo pré-pago ≥ custo do excedente
 * (exc. dev total / demo pública).
 */
export function podeResolverPrecoFipeComFundos(user: UsuarioAcessoRow): boolean {
  if (bypassConsumoFinanceiro()) return true;
  if (podeUsarConsultaFipe(user)) return true;
  return consumirExcedenteFipe(user, user.plano).permitido;
}
