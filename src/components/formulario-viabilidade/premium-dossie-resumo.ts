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
        if (r0.veiculo_placa) out.push(`Placa (registro): ${r0.veiculo_placa}`);
        if (r0.comitente) out.push(`Comitente: ${r0.comitente}`);
        if (r0.lote) out.push(`Lote: ${r0.lote}`);
        if (r0.data_leilao) out.push(`Data: ${r0.data_leilao}`);
      }
      if (d.parecer_tecnico_parecer) {
        out.push(`Parecer: ${d.parecer_tecnico_parecer}`);
      }
      if (d.sinistros_acidentes_possui_registro) {
        out.push(`Sinistros/acidentes: ${d.sinistros_acidentes_possui_registro}`);
      }
      return out;
    }
    case "roubo_furto": {
      const { registros } = dossie.dados;
      if (!registros.length) return [];
      return registros.map((r, i) =>
        [
          r.tipo_ocorrencia || `Ocorrência ${i + 1}`,
          r.data_boletim_ocorrencia ? r.data_boletim_ocorrencia : null,
          r.boletim_ocorrencia ? `B.O. ${r.boletim_ocorrencia}` : null,
          r.uf_ocorrencia ? `UF ${r.uf_ocorrencia}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      );
    }
    case "gravame": {
      const d = dossie.dados;
      const out: string[] = [];
      if (d.agente_financeiro_cnpj?.trim()) {
        out.push(`CNPJ: ${d.agente_financeiro_cnpj.trim()}`);
      }
      if (d.agente_financeiro_nome) {
        out.push(`Agente: ${d.agente_financeiro_nome}`);
      }
      if (d.data_registro) out.push(`Registro: ${d.data_registro}`);
      if (d.registro_placa?.trim()) {
        out.push(`Placa (registro): ${d.registro_placa.trim()}`);
      }
      if (d.registro_uf_placa?.trim()) {
        out.push(`UF: ${d.registro_uf_placa.trim()}`);
      }
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
