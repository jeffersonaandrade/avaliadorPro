import { dossieFromStoredBlock } from "@/lib/api-v2/parsers";
import type { TipoConsultaRiscoPremium } from "@/lib/consultas-risco-premium";
import { formatarMoedaBRL } from "@/lib/viabilidade";

/**
 * Linhas curtas para o card premium quando há indício positivo e dossiê.
 */
export function linhasResumoDossiePremium(
  tipo: TipoConsultaRiscoPremium,
  itemPremium: Record<string, unknown> | null
): string[] {
  if (!itemPremium) return [];
  const dossie = dossieFromStoredBlock(itemPremium.dossie);
  if (!dossie) return [];

  switch (dossie.tipo) {
    case "leilao": {
      const d = dossie.dados;
      const letra = d.classificacao_letra?.toUpperCase() ?? "";
      const out: string[] = [];
      if (letra) out.push(`Classe: ${letra}`);
      const r0 = d.registros[0];
      if (r0) {
        if (r0.comitente) out.push(`Comitente: ${r0.comitente}`);
        if (r0.lote) out.push(`Lote: ${r0.lote}`);
        if (r0.data_leilao) out.push(`Data: ${r0.data_leilao}`);
      }
      return out;
    }
    case "roubo_furto": {
      const d = dossie.dados;
      const r0 = d.registros[0];
      if (!r0) return [];
      const out: string[] = [];
      if (r0.boletim_ocorrencia) out.push(`B.O.: ${r0.boletim_ocorrencia}`);
      if (r0.data_boletim_ocorrencia) {
        out.push(`Data da ocorrência: ${r0.data_boletim_ocorrencia}`);
      }
      if (r0.uf_ocorrencia) out.push(`UF: ${r0.uf_ocorrencia}`);
      return out;
    }
    case "gravame": {
      const d = dossie.dados;
      const out: string[] = [];
      if (d.agente_financeiro_nome) {
        out.push(`Agente: ${d.agente_financeiro_nome}`);
      }
      if (d.data_registro) out.push(`Registro: ${d.data_registro}`);
      return out;
    }
    case "renainf": {
      const d = dossie.dados;
      const out: string[] = [];
      if (Number.isFinite(d.valor_total_reais) && d.valor_total_reais > 0) {
        out.push(`Valor total: ${formatarMoedaBRL(d.valor_total_reais)}`);
      }
      const i0 = d.infracoes[0];
      if (i0?.orgao_autuador) {
        out.push(`Órgão autuador: ${i0.orgao_autuador}`);
      }
      return out;
    }
    case "sinistro": {
      const t = dossie.dados.registro?.trim();
      return t ? [t] : [];
    }
    default:
      return [];
  }
}

/** Há conteúdo de dossié útil para modal / resumo. */
export function dossiePremiumTemDetalhes(
  tipo: TipoConsultaRiscoPremium,
  itemPremium: Record<string, unknown> | null
): boolean {
  return linhasResumoDossiePremium(tipo, itemPremium).length > 0;
}
