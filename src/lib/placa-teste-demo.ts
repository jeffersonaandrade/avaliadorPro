import { normalizarPlacaInput } from "@/lib/validations";

/** Placa reservada para demonstração na UI (formato antigo válido). */
export const PLACA_VEICULO_DEMONSTRACAO = "AAA0000" as const;

export function isPlacaVeiculoDemonstracao(placa: string): boolean {
  return normalizarPlacaInput(placa) === PLACA_VEICULO_DEMONSTRACAO;
}

/**
 * UI alinhada ao “veículo de teste”: com `NEXT_PUBLIC_USE_MOCKS=true` o backend já
 * define `sandboxAtivo` em todo resultado (mesmo cenário HB20 para qualquer placa).
 * Sem a flag, só a placa `AAA0000` mantém o mesmo tratamento visual.
 */
export function isResultadoVeiculoModoDemonstracao(
  sandboxAtivo: boolean,
  placaExibida: string
): boolean {
  return sandboxAtivo || isPlacaVeiculoDemonstracao(placaExibida);
}
