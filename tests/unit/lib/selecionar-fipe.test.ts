import { describe, expect, it } from "vitest";

import { selecionarMelhorFipe } from "@/lib/selecionar-fipe";

describe("selecionarMelhorFipe", () => {
  it("escolhe melhor match por modelo", () => {
    const r = selecionarMelhorFipe({
      modeloVeiculo: "HB20 1.0 Comfort",
      anoModelo: 2015,
      informacoesFipe: [
        { modelo_versao: "HB20S 1.0", preco: "43000.00", codigo_fipe: "a" },
        { modelo_versao: "HB20 1.0 Comfort", preco: "42000.00", codigo_fipe: "b" },
      ],
    });
    expect(r.item?.codigo_fipe).toBe("b");
    expect(r.fallback).toBe(false);
  });

  it("fallback para primeira opcao em baixa confianca", () => {
    const r = selecionarMelhorFipe({
      modeloVeiculo: "Modelo completamente diferente",
      anoModelo: 2020,
      informacoesFipe: [
        { modelo_versao: "Opcao A", preco: "30000.00", codigo_fipe: "a" },
        { modelo_versao: "Opcao B", preco: "40000.00", codigo_fipe: "b" },
      ],
    });
    expect(r.item?.codigo_fipe).toBe("a");
    expect(r.fallback).toBe(true);
    expect(r.avisoFipe).toContain("Multiplas versoes FIPE");
  });

  it("trata array vazio", () => {
    const r = selecionarMelhorFipe({
      modeloVeiculo: "HB20",
      anoModelo: 2015,
      informacoesFipe: [],
    });
    expect(r.item).toBeNull();
    expect(r.fallback).toBe(true);
  });
});

