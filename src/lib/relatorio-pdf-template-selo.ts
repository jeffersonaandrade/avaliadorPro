/**
 * Espelha a lógica de selo de `RelatorioAnalisePdf` para o PDF nativo (@react-pdf/renderer),
 * sem importar o componente web (evita acoplamento e mantém o HTML intocado).
 */
import type { ChaveFatorRisco } from "@/components/formulario-viabilidade/historico-veiculo";
import type { VereditoViabilidade } from "@/lib/viabilidade";

const PILARES: { chave: ChaveFatorRisco; label: string }[] = [
  { chave: "leilao", label: "Leilão" },
  { chave: "sinistro", label: "Sinistro" },
  { chave: "roubo", label: "Roubo / furto" },
  { chave: "gravame", label: "Gravame" },
];

export function obterRotulosRiscoAtivosPdf(
  flagsRisco: Record<ChaveFatorRisco, boolean>
): string[] {
  return PILARES.filter((p) => flagsRisco[p.chave]).map((p) => p.label);
}

function seloVeredito(veredito: VereditoViabilidade): {
  titulo: string;
  molduraClasse: string;
} {
  switch (veredito) {
    case "viavel":
      return {
        titulo: "VIÁVEL",
        molduraClasse:
          "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200",
      };
    case "atencao":
      return {
        titulo: "ATENÇÃO",
        molduraClasse:
          "border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-200",
      };
    case "arriscado":
      return {
        titulo: "ARRISCADO",
        molduraClasse: "border-red-600 bg-red-50 text-red-950 ring-2 ring-red-200",
      };
    default:
      return {
        titulo: "VEREDITO INDETERMINADO",
        molduraClasse:
          "border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-200",
      };
  }
}

export function resolverSeloTemplatePdf(
  veredito: VereditoViabilidade,
  subtituloMotor: string,
  opts: {
    blindagemAtiva: boolean;
    contextoFipeMercadoAtivo: boolean;
    riscoEstruturalLeilaoOuSinistro: boolean;
    margemFinanceiraAguardandoCustos: boolean;
  }
): { titulo: string; subtitulo: string; molduraClasse: string } {
  if (!opts.contextoFipeMercadoAtivo) {
    const base = seloVeredito(veredito);
    return { titulo: base.titulo, subtitulo: subtituloMotor, molduraClasse: base.molduraClasse };
  }
  if (!opts.blindagemAtiva) {
    return {
      titulo: "ANÁLISE DE RISCO INCOMPLETA",
      molduraClasse:
        "border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-200",
      subtitulo:
        "Valores abaixo usam referência de mercado e custos informados. Valide o histórico premium para concluir riscos ocultos (leilão, sinistro, gravame e demais bases).",
    };
  }
  const base = seloVeredito(veredito);
  if (opts.riscoEstruturalLeilaoOuSinistro) {
    const texto =
      "Veículo com histórico crítico (leilão, sinistro ou restrições). Alto risco de prejuízo e baixa liquidez.";
    const extra = opts.margemFinanceiraAguardandoCustos
      ? " Aguarde reparos e documentação para calcular lucro e margem com precisão."
      : "";
    return {
      titulo: "NÃO RECOMENDADO PARA COMPRA",
      molduraClasse:
        "border-red-600 bg-red-50 text-red-950 ring-2 ring-red-200",
      subtitulo: texto + extra,
    };
  }
  if (opts.margemFinanceiraAguardandoCustos) {
    return {
      titulo: "MARGEM FINANCEIRA PENDENTE",
      molduraClasse:
        "border-slate-500 bg-slate-100 text-slate-900 ring-2 ring-slate-200",
      subtitulo:
        "Aguardando dados de custo (reparos/documentação) para calcular lucro.",
    };
  }
  return { titulo: base.titulo, subtitulo: subtituloMotor, molduraClasse: base.molduraClasse };
}
