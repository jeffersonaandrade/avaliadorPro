import { normalizarPlacaInput, placaSchema } from "@/lib/validations";

/**
 * Valor padrão se `NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO` estiver ausente ou inválido.
 * Documentação do provedor costuma usar esta placa em exemplos de sandbox.
 */
export const PLACA_VEICULO_DEMONSTRACAO_PADRAO = "AAA0000" as const;

/**
 * Placa tratada como “demonstração” na UI (badge, PDF, avisos) quando **não** há
 * `NEXT_PUBLIC_USE_MOCKS=true`. Configure em `.env.local` para alinhar ao sandbox
 * do provedor sem hardcode no código (útil antes de PRD).
 */
export function obterPlacaVeiculoDemonstracao(): string {
  const raw = process.env.NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO?.trim();
  if (!raw) return PLACA_VEICULO_DEMONSTRACAO_PADRAO;
  const r = placaSchema.safeParse(raw);
  if (!r.success) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        "[avaliador] NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO inválida; usando",
        PLACA_VEICULO_DEMONSTRACAO_PADRAO
      );
    }
    return PLACA_VEICULO_DEMONSTRACAO_PADRAO;
  }
  return r.data;
}

/**
 * @deprecated Use `obterPlacaVeiculoDemonstracao()` — o valor efetivo vem do env em runtime.
 * Mantido para compat: igual ao padrão documental, não ao env resolvido.
 */
export const PLACA_VEICULO_DEMONSTRACAO = PLACA_VEICULO_DEMONSTRACAO_PADRAO;

export function isPlacaVeiculoDemonstracao(placa: string): boolean {
  return normalizarPlacaInput(placa) === obterPlacaVeiculoDemonstracao();
}

/**
 * UI alinhada ao “veículo de teste”: com `NEXT_PUBLIC_USE_MOCKS=true` o backend já
 * define `sandboxAtivo` em todo resultado (perfil sandbox para qualquer placa digitada).
 * Sem a flag, a placa configurada em `NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO` (ou o
 * padrão `AAA0000`) mantém o mesmo tratamento visual.
 */
export function isResultadoVeiculoModoDemonstracao(
  sandboxAtivo: boolean,
  placaExibida: string
): boolean {
  return sandboxAtivo || isPlacaVeiculoDemonstracao(placaExibida);
}
