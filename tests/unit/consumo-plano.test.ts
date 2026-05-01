import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { UsuarioAcessoRow } from "@/lib/usuario-acesso";

vi.mock("@/lib/usuario-acesso", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/usuario-acesso")>();
  return {
    ...mod,
    debitarCreditoPremium: vi.fn(),
    registrarConsumoFipePosMatch: vi.fn(),
  };
});

import * as usuarioAcesso from "@/lib/usuario-acesso";
import {
  calcularCustoExcedente,
  consumirBlindagem,
  podeConsumirBlindagem,
  registrarConsultaFipe,
} from "@/lib/consumo-plano";
import { limitesPlanoPorSlug } from "@/lib/planos-marketing";

function baseUser(over: Partial<UsuarioAcessoRow>): UsuarioAcessoRow {
  return {
    identificador: "u1",
    plano_ativo: true,
    plano: "pro",
    consultas_fipe_utilizadas: 0,
    consultas_fipe_limite: 30,
    fipe_mes_referencia: "2026-04",
    creditos_premium: 1,
    consultas_excedentes: 0,
    valor_total_excedente: 0,
    saldo_pre_pago: 0,
    ...over,
  };
}

describe("consumo-plano", () => {
  const prevMocks = process.env.NEXT_PUBLIC_USE_MOCKS;
  const prevDev = process.env.AVALIADOR_DEV_ACESSO_TOTAL;

  beforeEach(() => {
    vi.mocked(usuarioAcesso.debitarCreditoPremium).mockReset();
    vi.mocked(usuarioAcesso.registrarConsumoFipePosMatch).mockReset();
    delete process.env.NEXT_PUBLIC_USE_MOCKS;
    delete process.env.AVALIADOR_DEV_ACESSO_TOTAL;
  });

  afterEach(() => {
    if (prevMocks !== undefined) process.env.NEXT_PUBLIC_USE_MOCKS = prevMocks;
    else delete process.env.NEXT_PUBLIC_USE_MOCKS;
    if (prevDev !== undefined) process.env.AVALIADOR_DEV_ACESSO_TOTAL = prevDev;
    else delete process.env.AVALIADOR_DEV_ACESSO_TOTAL;
  });

  it("blindagem: consumirBlindagem delega o débito", async () => {
    vi.mocked(usuarioAcesso.debitarCreditoPremium).mockResolvedValue(true);
    const ok = await consumirBlindagem("abc");
    expect(ok).toBe(true);
    expect(usuarioAcesso.debitarCreditoPremium).toHaveBeenCalledWith("abc");
  });

  it("bloqueia blindagem sem crédito (modo real)", () => {
    const u = baseUser({ creditos_premium: 0 });
    expect(podeConsumirBlindagem(u)).toBe(false);
  });

  it("permite blindagem com saldo", () => {
    expect(podeConsumirBlindagem(baseUser({ creditos_premium: 1 }))).toBe(true);
  });

  it("FIPE: registrarConsultaFipe propaga resultado de excedente", async () => {
    vi.mocked(usuarioAcesso.registrarConsumoFipePosMatch).mockResolvedValue({
      ok: true,
      modo: "excedente",
      valorCobradoReais: 1.29,
    });
    const r = await registrarConsultaFipe("id", { placa: "ABC1D23" });
    expect(r).toEqual({
      ok: true,
      modo: "excedente",
      valorCobradoReais: 1.29,
    });
    expect(usuarioAcesso.registrarConsumoFipePosMatch).toHaveBeenCalledWith(
      "id",
      { placa: "ABC1D23" }
    );
  });

  it("excedente: acumula valor_total coerente com o preço do plano", () => {
    const preco = calcularCustoExcedente("pro");
    expect(preco).toBe(1.29);
    let vt = 0;
    for (let i = 0; i < 3; i++) {
      vt = Math.round((vt + preco) * 100) / 100;
    }
    expect(vt).toBe(3.87);
  });

  it("reset de teste: bundle inicial por slug (starter / pro / premium)", () => {
    expect(limitesPlanoPorSlug("starter")).toEqual({
      consultasFipeLimite: 10,
      creditosPremium: 0,
    });
    expect(limitesPlanoPorSlug("pro")).toEqual({
      consultasFipeLimite: 30,
      creditosPremium: 1,
    });
    expect(limitesPlanoPorSlug("premium")).toEqual({
      consultasFipeLimite: 60,
      creditosPremium: 3,
    });
  });
});
