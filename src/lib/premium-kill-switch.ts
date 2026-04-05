/**
 * Kill switch global para chamadas às APIs premium (Consultar Placa v2).
 * - `PREMIUM_API_KILL_SWITCH=true` no ambiente força bloqueio em qualquer instância.
 * - Memória (toggle via admin em modo demo) para simulação local.
 */
let memoriaKillSwitch = false;

export function isPremiumApiKillSwitchActive(): boolean {
  if (
    String(process.env.PREMIUM_API_KILL_SWITCH ?? "")
      .trim()
      .toLowerCase() === "true"
  ) {
    return true;
  }
  return memoriaKillSwitch;
}

export function setPremiumKillSwitchMemoria(ativo: boolean): void {
  memoriaKillSwitch = ativo;
}

export function getPremiumKillSwitchMemoria(): boolean {
  return memoriaKillSwitch;
}

/** Vitest / resets manuais */
export function resetPremiumKillSwitchMemoriaForTests(): void {
  memoriaKillSwitch = false;
}
