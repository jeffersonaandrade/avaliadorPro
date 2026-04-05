"use server";

import { isPublicDemoMocksMode } from "@/lib/demo-mocks";
import {
  getPremiumKillSwitchMemoria,
  isPremiumApiKillSwitchActive,
  setPremiumKillSwitchMemoria,
} from "@/lib/premium-kill-switch";

export type EstadoKillSwitchPremium = {
  efetivo: boolean;
  memoria: boolean;
  envForcado: boolean;
};

export async function obterEstadoKillSwitchPremiumAction(): Promise<EstadoKillSwitchPremium> {
  const envForcado =
    String(process.env.PREMIUM_API_KILL_SWITCH ?? "")
      .trim()
      .toLowerCase() === "true";
  return {
    envForcado,
    memoria: getPremiumKillSwitchMemoria(),
    efetivo: isPremiumApiKillSwitchActive(),
  };
}

/**
 * Alterna apenas o kill switch em memória (simulado). Em produção use env ou painel seguro.
 */
export async function alternarKillSwitchPremiumDemoAction(): Promise<
  | { ok: true; efetivo: boolean }
  | { ok: false; erro: string }
> {
  if (!isPublicDemoMocksMode()) {
    return {
      ok: false,
      erro: "Toggle disponível somente com NEXT_PUBLIC_USE_MOCKS=true.",
    };
  }
  if (
    String(process.env.PREMIUM_API_KILL_SWITCH ?? "")
      .trim()
      .toLowerCase() === "true"
  ) {
    return {
      ok: false,
      erro: "Kill switch fixo por variável PREMIUM_API_KILL_SWITCH=true.",
    };
  }
  setPremiumKillSwitchMemoria(!getPremiumKillSwitchMemoria());
  return { ok: true, efetivo: isPremiumApiKillSwitchActive() };
}
