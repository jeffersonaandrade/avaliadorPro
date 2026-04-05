import {
  extrairFlagsHistoricoVeiculo,
  FATORES_RISCO,
} from "@/components/formulario-viabilidade/historico-veiculo";
import {
  dadosLeilaoSemConsultasPremium,
  extrairRiscosCarregadosDeDadosLeilao,
  mergeFlagsComConsultasPremium,
} from "@/lib/consultas-risco-premium";
import {
  AJUSTE_FIPE_PCT_MAX,
  AJUSTE_FIPE_PCT_MIN,
  parseValorBRL,
} from "@/lib/viabilidade";

/**
 * Alinha à memória de cálculo da UI (sem `MIN` com preço de venda esperado):
 * base sem risco = FIPE × (1 + ajuste mercado);
 * base com risco = FIPE × (1 + ajuste + impacto agregado dos fatores ativos).
 * Retorno em reais, ≥ 0, 2 casas (arredondamento bancário simples).
 */
export function calcularValorEvitarPerdaReais(input: {
  fipeTexto: string;
  dadosLeilao: Record<string, unknown> | null | undefined;
  simulacaoViabilidade: unknown | null | undefined;
}): number | null {
  const fipe = parseValorBRL(input.fipeTexto ?? "");
  if (!Number.isFinite(fipe) || fipe <= 0) return null;

  const root = input.dadosLeilao ?? {};
  const flagsBase = extrairFlagsHistoricoVeiculo(
    dadosLeilaoSemConsultasPremium(root)
  );
  const riscos = extrairRiscosCarregadosDeDadosLeilao(root);
  const flags = mergeFlagsComConsultasPremium(flagsBase, riscos);

  const impactoBruto =
    (flags.leilao ? FATORES_RISCO.leilao : 0) +
    (flags.sinistro ? FATORES_RISCO.sinistro : 0) +
    (flags.roubo ? FATORES_RISCO.roubo : 0) +
    (flags.gravame ? FATORES_RISCO.gravame : 0) +
    (flags.renainf ? FATORES_RISCO.renainf : 0);

  const impactoTotal = Math.max(-0.5, impactoBruto);

  let ajustePct = 0;
  if (
    input.simulacaoViabilidade &&
    typeof input.simulacaoViabilidade === "object"
  ) {
    const s = input.simulacaoViabilidade as Record<string, unknown>;
    const a = s.ajusteFipePct;
    if (typeof a === "number" && Number.isFinite(a)) {
      ajustePct = Math.max(
        AJUSTE_FIPE_PCT_MIN,
        Math.min(AJUSTE_FIPE_PCT_MAX, a)
      );
    }
  }

  const ajusteDec = ajustePct / 100;
  const baseSemRisco = fipe * (1 + ajusteDec);
  const baseComRisco = fipe * (1 + ajusteDec + impactoTotal);
  const raw = baseSemRisco - baseComRisco;
  return Math.max(0, Math.round(raw * 100) / 100);
}
