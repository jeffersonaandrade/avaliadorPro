import {
  DESVIO_VENDA_ABAIXO_FIPE,
  DESVIO_VENDA_ACIMA_FIPE,
  LUCRO_ELEVADO_LIMITE_PCT,
} from "@/components/formulario-viabilidade/constants";
import { arredondarReais2 } from "./viabilidade";

/** Mesma regra do formulário: lucro desejado acima do limite educativo. */
export function isLucroDesejadoElevado(pctLucro: number): boolean {
  return pctLucro > LUCRO_ELEVADO_LIMITE_PCT;
}

export type AlertasDesvioVendaFipe = {
  desvioVendaEsperadaVsFipe: number | null;
  alertaVendaAcimaMercado: boolean;
  alertaVendaAbaixoMercado: boolean;
};

/**
 * Desvio relativo da venda esperada vs FIPE da consulta e flags de alerta (thresholds da UI).
 */
export function calcularAlertasDesvioVendaEsperadaFipe(input: {
  fipeDisponivelNaConsulta: boolean;
  precoVendaEsperadoReais: number;
  fipeReferenciaConsulta: number;
}): AlertasDesvioVendaFipe {
  const {
    fipeDisponivelNaConsulta,
    precoVendaEsperadoReais,
    fipeReferenciaConsulta,
  } = input;

  const desvioVendaEsperadaVsFipe =
    fipeDisponivelNaConsulta && precoVendaEsperadoReais > 0
      ? (precoVendaEsperadoReais - fipeReferenciaConsulta) /
        fipeReferenciaConsulta
      : null;

  return {
    desvioVendaEsperadaVsFipe,
    alertaVendaAcimaMercado:
      desvioVendaEsperadaVsFipe !== null &&
      desvioVendaEsperadaVsFipe > DESVIO_VENDA_ACIMA_FIPE,
    alertaVendaAbaixoMercado:
      desvioVendaEsperadaVsFipe !== null &&
      desvioVendaEsperadaVsFipe < DESVIO_VENDA_ABAIXO_FIPE,
  };
}

/**
 * Cenário pessimista exibido no resumo: multiplicadores com/sem risco estrutural no histórico.
 */
export function calcularCenarioPessimista(
  custoTotal: number,
  baseVenda: number,
  temRiscoEstrutural: boolean
): { custoPessimista: number; vendaPessimista: number } {
  const custoBruto = temRiscoEstrutural
    ? custoTotal * 1.05
    : custoTotal * 1.1;
  const vendaBruta = temRiscoEstrutural ? baseVenda * 0.95 : baseVenda * 0.9;
  return {
    custoPessimista: Math.max(0, arredondarReais2(custoBruto)),
    vendaPessimista: Math.max(0, arredondarReais2(vendaBruta)),
  };
}
