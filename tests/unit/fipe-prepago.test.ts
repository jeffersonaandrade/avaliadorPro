import { describe, expect, it, afterEach, beforeEach } from "vitest";

import {
  calcularCustoExcedente,
  consumirExcedenteFipe,
  podeResolverPrecoFipeComFundos,
} from "@/lib/consumo-plano";
import type { UsuarioAcessoRow } from "@/lib/usuario-acesso";

function u(over: Partial<UsuarioAcessoRow>): UsuarioAcessoRow {
  return {
    identificador: "u1",
    plano_ativo: true,
    plano: "starter",
    consultas_fipe_utilizadas: 10,
    consultas_fipe_limite: 10,
    fipe_mes_referencia: "2026-04",
    creditos_premium: 0,
    consultas_excedentes: 0,
    valor_total_excedente: 0,
    saldo_pre_pago: 0,
    ...over,
  };
}

describe("FIPE pré-pago (excedente)", () => {
  const prevMocks = process.env.NEXT_PUBLIC_USE_MOCKS;
  const prevDev = process.env.AVALIADOR_DEV_ACESSO_TOTAL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_USE_MOCKS;
    delete process.env.AVALIADOR_DEV_ACESSO_TOTAL;
  });

  afterEach(() => {
    if (prevMocks !== undefined) process.env.NEXT_PUBLIC_USE_MOCKS = prevMocks;
    else delete process.env.NEXT_PUBLIC_USE_MOCKS;
    if (prevDev !== undefined) process.env.AVALIADOR_DEV_ACESSO_TOTAL = prevDev;
    else delete process.env.AVALIADOR_DEV_ACESSO_TOTAL;
  });

  it("não permite excedente sem saldo (gate antes da API)", () => {
    const user = u({ saldo_pre_pago: 0 });
    expect(podeResolverPrecoFipeComFundos(user)).toBe(false);
    expect(consumirExcedenteFipe(user, "starter").permitido).toBe(false);
  });

  it("permite excedente com saldo suficiente", () => {
    const custo = calcularCustoExcedente("starter");
    const user = u({ saldo_pre_pago: custo });
    expect(podeResolverPrecoFipeComFundos(user)).toBe(true);
    expect(consumirExcedenteFipe(user, "starter").permitido).toBe(true);
  });

  it("saldo cobre custo do plano (pro)", () => {
    const custo = calcularCustoExcedente("pro");
    expect(custo).toBe(1.29);
    const user = u({
      plano: "pro",
      consultas_fipe_limite: 30,
      consultas_fipe_utilizadas: 30,
      saldo_pre_pago: 1.29,
    });
    expect(consumirExcedenteFipe(user, "pro").permitido).toBe(true);
  });

  it("matemática do débito: saldo menos custo arredondado a 2 casas", () => {
    const saldo = 10;
    const preco = calcularCustoExcedente("starter");
    expect(preco).toBe(1.49);
    const novo = Math.round((saldo - preco) * 100) / 100;
    expect(novo).toBe(8.51);
  });
});
