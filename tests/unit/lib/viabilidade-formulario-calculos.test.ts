import { describe, expect, it } from "vitest";
import {
  DESVIO_VENDA_ABAIXO_FIPE,
  DESVIO_VENDA_ACIMA_FIPE,
  LUCRO_ELEVADO_LIMITE_PCT,
} from "@/components/formulario-viabilidade/constants";
import {
  calcularAlertasDesvioVendaEsperadaFipe,
  calcularCenarioPessimista,
  isLucroDesejadoElevado,
} from "@/lib/viabilidade-formulario-calculos";

describe("calcularCenarioPessimista (stress / multiplicadores)", () => {
  it("sem risco estrutural: custo ×1,1 e venda ×0,9 arredondados", () => {
    const { custoPessimista, vendaPessimista } = calcularCenarioPessimista(
      10_000,
      50_000,
      false
    );
    expect(custoPessimista).toBe(11_000);
    expect(vendaPessimista).toBe(45_000);
  });

  it("com risco estrutural: custo ×1,05 e venda ×0,95", () => {
    const { custoPessimista, vendaPessimista } = calcularCenarioPessimista(
      10_000,
      100_000,
      true
    );
    expect(custoPessimista).toBe(10_500);
    expect(vendaPessimista).toBe(95_000);
  });

  it("valores fracionários: saída com no máximo 2 casas decimais", () => {
    const { custoPessimista, vendaPessimista } = calcularCenarioPessimista(
      333.33,
      999.99,
      false
    );
    expect(custoPessimista).toBe(Math.round(333.33 * 1.1 * 100) / 100);
    expect(vendaPessimista).toBe(Math.round(999.99 * 0.9 * 100) / 100);
    expect(custoPessimista).toBe(366.66);
    expect(vendaPessimista).toBe(899.99);
  });

  it("não retorna negativo com entradas zero", () => {
    const r = calcularCenarioPessimista(0, 0, true);
    expect(r.custoPessimista).toBe(0);
    expect(r.vendaPessimista).toBe(0);
  });
});

describe("isLucroDesejadoElevado e alertas de desvio (thresholds)", () => {
  it("lucro > limite aciona; exatamente no limite não aciona", () => {
    expect(isLucroDesejadoElevado(LUCRO_ELEVADO_LIMITE_PCT)).toBe(false);
    expect(isLucroDesejadoElevado(LUCRO_ELEVADO_LIMITE_PCT + 0.001)).toBe(true);
    expect(isLucroDesejadoElevado(20.01)).toBe(true);
    expect(isLucroDesejadoElevado(19.99)).toBe(false);
  });

  it("venda esperada > +20% da FIPE: estritamente acima do threshold", () => {
    const noLimite = calcularAlertasDesvioVendaEsperadaFipe({
      fipeDisponivelNaConsulta: true,
      precoVendaEsperadoReais: 120,
      fipeReferenciaConsulta: 100,
    });
    expect(noLimite.desvioVendaEsperadaVsFipe).toBeCloseTo(
      DESVIO_VENDA_ACIMA_FIPE,
      10
    );
    expect(noLimite.alertaVendaAcimaMercado).toBe(false);

    const acima = calcularAlertasDesvioVendaEsperadaFipe({
      fipeDisponivelNaConsulta: true,
      precoVendaEsperadoReais: 120.01,
      fipeReferenciaConsulta: 100,
    });
    expect(acima.desvioVendaEsperadaVsFipe).toBeGreaterThan(
      DESVIO_VENDA_ACIMA_FIPE
    );
    expect(acima.alertaVendaAcimaMercado).toBe(true);
  });

  it("venda esperada < -30% da FIPE: estritamente abaixo do threshold", () => {
    const noLimite = calcularAlertasDesvioVendaEsperadaFipe({
      fipeDisponivelNaConsulta: true,
      precoVendaEsperadoReais: 70,
      fipeReferenciaConsulta: 100,
    });
    expect(noLimite.desvioVendaEsperadaVsFipe).toBeCloseTo(
      DESVIO_VENDA_ABAIXO_FIPE,
      10
    );
    expect(noLimite.alertaVendaAbaixoMercado).toBe(false);

    const abaixo = calcularAlertasDesvioVendaEsperadaFipe({
      fipeDisponivelNaConsulta: true,
      precoVendaEsperadoReais: 69.99,
      fipeReferenciaConsulta: 100,
    });
    expect(abaixo.desvioVendaEsperadaVsFipe).toBeLessThan(
      DESVIO_VENDA_ABAIXO_FIPE
    );
    expect(abaixo.alertaVendaAbaixoMercado).toBe(true);
  });

  it("sem FIPE na consulta ou venda zero: sem desvio nem alertas", () => {
    const a = calcularAlertasDesvioVendaEsperadaFipe({
      fipeDisponivelNaConsulta: false,
      precoVendaEsperadoReais: 50_000,
      fipeReferenciaConsulta: 100_000,
    });
    expect(a.desvioVendaEsperadaVsFipe).toBeNull();
    expect(a.alertaVendaAcimaMercado).toBe(false);
    expect(a.alertaVendaAbaixoMercado).toBe(false);

    const b = calcularAlertasDesvioVendaEsperadaFipe({
      fipeDisponivelNaConsulta: true,
      precoVendaEsperadoReais: 0,
      fipeReferenciaConsulta: 100_000,
    });
    expect(b.desvioVendaEsperadaVsFipe).toBeNull();
    expect(b.alertaVendaAcimaMercado).toBe(false);
  });
});
