import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import type { RelatorioVeiculoMeta } from "@/components/painel/RelatorioAnalisePdf";
import type { ChaveFatorRisco } from "@/components/formulario-viabilidade/historico-veiculo";
import type { VereditoViabilidade } from "@/lib/viabilidade";
import type { EstadoDecisao } from "@/lib/microcopy-decisao";
import { formatarMoedaBRLExibicao } from "@/lib/formato-moeda-exibicao";
import { obterMicrocopyDecisao } from "@/lib/microcopy-decisao";
import {
  obterRotulosRiscoAtivosPdf,
  resolverSeloTemplatePdf,
} from "@/lib/relatorio-pdf-template-selo";

export type TemplateRelatorioPdfProps = {
  placa: string;
  fipeTexto: string;
  meta: RelatorioVeiculoMeta;
  flagsRisco: Record<ChaveFatorRisco, boolean>;
  fipeReferenciaReais: number | null;
  baseVenda: number;
  ofertaMaxima: number | null;
  contextoFipeMercadoAtivo: boolean;
  blindagemAtiva?: boolean;
  riscoEstruturalLeilaoOuSinistro?: boolean;
  margemFinanceiraAguardandoCustos?: boolean;
  veredito: VereditoViabilidade;
  subtituloVeredito: string;
  perdaHistoricoReais?: number;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 44,
    paddingBottom: 44,
    paddingHorizontal: 40,
    color: "#0f172a",
    lineHeight: 1.45,
  },
  demoBanner: {
    marginBottom: 12,
    padding: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#f87171",
    backgroundColor: "#fef2f2",
    textAlign: "center",
  },
  demoBannerText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#7f1d1d",
    textTransform: "uppercase",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  brandSub: {
    marginTop: 4,
    fontSize: 7,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  metaRight: {
    alignItems: "flex-end",
    maxWidth: 200,
  },
  metaLine: {
    fontSize: 8,
    color: "#475569",
    textAlign: "right",
    marginBottom: 3,
  },
  metaStrong: {
    fontWeight: "bold",
    color: "#334155",
  },
  placaMono: {
    marginTop: 4,
    fontSize: 8,
    fontFamily: "Courier",
    color: "#64748b",
  },
  section: {
    marginBottom: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    backgroundColor: "#f8fafc",
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  label: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 2,
  },
  valueLg: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
  },
  valueMd: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },
  fipeHero: {
    fontSize: 14,
    fontWeight: "bold",
    fontVariant: "tabular-nums",
  },
  listItem: {
    marginBottom: 6,
    fontSize: 10,
    color: "#1e293b",
  },
  listStrong: {
    fontWeight: "bold",
    color: "#0f172a",
  },
  footnote: {
    marginTop: 8,
    fontSize: 8,
    color: "#64748b",
    fontWeight: "medium",
  },
  verdictShell: {
    borderWidth: 2,
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  verdictKicker: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 8,
    color: "#334155",
  },
  verdictSub: {
    fontSize: 9,
    textAlign: "center",
    lineHeight: 1.5,
  },
  precoSectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#0f172a",
  },
  precoBox: {
    backgroundColor: "#0e7490",
    borderWidth: 2,
    borderColor: "#0f172a",
    borderRadius: 6,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  precoKicker: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#fde68a",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: 8,
  },
  precoValor: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    fontVariant: "tabular-nums",
  },
  precoHint: {
    marginTop: 10,
    fontSize: 9,
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: 1.45,
  },
  precoRef: {
    marginTop: 8,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
  recoBox: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  recoTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  recoBody: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.5,
  },
  avisoMercado: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    backgroundColor: "#ffffff",
    fontSize: 10,
    color: "#475569",
    lineHeight: 1.5,
  },
  rodapeFase: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 1.4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 100,
    marginRight: 6,
  },
  resumoVereditoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  listItemPlain: {
    fontSize: 10,
    color: "#1e293b",
  },
  verdictTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  verdictTitleInline: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});

function formatarDataHoraBr(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function molduraClasseParaEstilos(molduraClasse: string): {
  borderColor: string;
  backgroundColor: string;
  titleColor: string;
  subColor: string;
} {
  if (molduraClasse.includes("border-amber-400")) {
    return {
      borderColor: "#fbbf24",
      backgroundColor: "#fffbeb",
      titleColor: "#78350f",
      subColor: "#92400e",
    };
  }
  if (molduraClasse.includes("emerald")) {
    return {
      borderColor: "#059669",
      backgroundColor: "#ecfdf5",
      titleColor: "#064e3b",
      subColor: "#047857",
    };
  }
  if (molduraClasse.includes("amber")) {
    return {
      borderColor: "#d97706",
      backgroundColor: "#fffbeb",
      titleColor: "#78350f",
      subColor: "#92400e",
    };
  }
  if (molduraClasse.includes("red")) {
    return {
      borderColor: "#dc2626",
      backgroundColor: "#fef2f2",
      titleColor: "#7f1d1d",
      subColor: "#991b1b",
    };
  }
  if (molduraClasse.includes("slate-500")) {
    return {
      borderColor: "#64748b",
      backgroundColor: "#f1f5f9",
      titleColor: "#0f172a",
      subColor: "#334155",
    };
  }
  return {
    borderColor: "#94a3b8",
    backgroundColor: "#f1f5f9",
    titleColor: "#0f172a",
    subColor: "#475569",
  };
}

/** Cores da bolinha de status — @react-pdf não renderiza emojis de selo de forma confiável. */
function corStatusDotPorMoldura(molduraClasse: string): string {
  if (molduraClasse.includes("red")) return "#dc2626";
  if (molduraClasse.includes("emerald")) return "#16a34a";
  if (molduraClasse.includes("amber")) return "#f59e0b";
  if (molduraClasse.includes("slate-500")) return "#64748b";
  return "#64748b";
}

function StatusDot({ color }: { color: string }) {
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

export function TemplateRelatorioPdf({
  placa,
  fipeTexto,
  meta,
  flagsRisco,
  fipeReferenciaReais,
  baseVenda,
  ofertaMaxima,
  contextoFipeMercadoAtivo,
  blindagemAtiva = false,
  riscoEstruturalLeilaoOuSinistro = false,
  margemFinanceiraAguardandoCustos = false,
  veredito,
  subtituloVeredito,
  perdaHistoricoReais = 0,
}: TemplateRelatorioPdfProps) {
  const consultaFmt = formatarDataHoraBr(meta.consultadoEmIso);
  const emitidoFmt = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const fipeOk =
    fipeReferenciaReais !== null &&
    Number.isFinite(fipeReferenciaReais) &&
    fipeReferenciaReais > 0;

  const selo = resolverSeloTemplatePdf(veredito, subtituloVeredito, {
    blindagemAtiva,
    contextoFipeMercadoAtivo,
    riscoEstruturalLeilaoOuSinistro,
    margemFinanceiraAguardandoCustos,
  });
  const moldura = molduraClasseParaEstilos(selo.molduraClasse);
  const corStatusDot = corStatusDotPorMoldura(selo.molduraClasse);

  const rotulosAtivos = obterRotulosRiscoAtivosPdf(flagsRisco);
  const estadoDecisao: EstadoDecisao =
    !blindagemAtiva || !contextoFipeMercadoAtivo || margemFinanceiraAguardandoCustos
      ? "incompleto"
      : veredito === "viavel"
        ? "verde"
        : veredito === "atencao"
          ? "amarelo"
          : "vermelho";
  const microcopyDecisao = obterMicrocopyDecisao(
    estadoDecisao,
    perdaHistoricoReais,
    rotulosAtivos
  );
  const riscoPrincipal =
    rotulosAtivos.length > 0 ? rotulosAtivos[0] : "Sem indícios críticos";
  const statusBlindagemResumo =
    blindagemAtiva && contextoFipeMercadoAtivo
      ? "Histórico validado nas bases premium."
      : "Histórico premium não validado. A decisão ainda pode mudar após a blindagem.";

  const exibirPerdaRisco =
    blindagemAtiva &&
    fipeOk &&
    contextoFipeMercadoAtivo &&
    perdaHistoricoReais > 0;

  const ofertaFmt =
    ofertaMaxima !== null && Number.isFinite(ofertaMaxima)
      ? formatarMoedaBRLExibicao(ofertaMaxima)
      : "—";

  const perdaFmt = exibirPerdaRisco
    ? formatarMoedaBRLExibicao(perdaHistoricoReais)
    : "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {meta.relatorioDemonstracao ? (
          <View style={styles.demoBanner} wrap={false}>
            <Text style={styles.demoBannerText}>
              Relatório de demonstração — dados simulados
            </Text>
          </View>
        ) : null}

        <View style={styles.headerRow} wrap={false}>
          <View>
            <Text style={styles.brandTitle}>Avaliador PRO</Text>
            <Text style={styles.brandSub}>
              Relatório de viabilidade (fase 1 — PDF nativo)
            </Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLine}>
              <Text style={styles.metaStrong}>Consulta: </Text>
              {consultaFmt}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaStrong}>Emitido em: </Text>
              {emitidoFmt}
            </Text>
            <Text style={styles.placaMono}>{placa}</Text>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Veículo</Text>
          <Text style={styles.label}>Placa</Text>
          <Text style={styles.valueLg}>{placa}</Text>
          <Text style={styles.label}>Ano modelo</Text>
          <Text style={styles.valueMd}>{meta.ano}</Text>
          <Text style={styles.label}>Modelo</Text>
          <Text style={styles.valueMd}>
            {meta.marca ? `${meta.marca} · ` : ""}
            {meta.modelo}
          </Text>
          <Text style={styles.label}>Referência de mercado (FIPE tabela)</Text>
          <Text style={styles.fipeHero}>
            {fipeTexto === "—" ? "Indisponível" : fipeTexto}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo executivo</Text>
          <View style={styles.resumoVereditoRow} wrap={false}>
            <Text style={styles.listStrong}>Veredito: </Text>
            <View style={styles.statusRow}>
              <StatusDot color={corStatusDot} />
              <Text style={styles.listItemPlain}>{selo.titulo}</Text>
            </View>
          </View>
          <Text style={styles.listItem}>
            <Text style={styles.listStrong}>Preço máximo seguro: </Text>
            {ofertaFmt}
          </Text>
          <Text style={styles.listItem}>
            <Text style={styles.listStrong}>Recomendação direta: </Text>
            {microcopyDecisao.recomendacao}
          </Text>
          <Text style={styles.listItem}>
            <Text style={styles.listStrong}>Risco principal: </Text>
            {riscoPrincipal}
          </Text>
          <Text style={styles.listItem}>
            <Text style={styles.listStrong}>Valor que você evitou perder: </Text>
            {perdaFmt}
          </Text>
          <Text style={styles.footnote}>{statusBlindagemResumo}</Text>
        </View>

        <View
          wrap={false}
          style={[
            styles.verdictShell,
            {
              borderColor: moldura.borderColor,
              backgroundColor: moldura.backgroundColor,
            },
          ]}
        >
          <Text style={[styles.verdictKicker, { color: moldura.subColor }]}>
            Veredito
          </Text>
          <View style={styles.verdictTitleRow} wrap={false}>
            <StatusDot color={corStatusDot} />
            <Text
              style={[
                styles.verdictTitleInline,
                { color: moldura.titleColor },
              ]}
            >
              {selo.titulo}
            </Text>
          </View>
          <Text style={[styles.verdictSub, { color: moldura.subColor }]}>
            {selo.subtitulo}
          </Text>
        </View>

        {fipeOk && contextoFipeMercadoAtivo ? (
          <>
            <View break />
            <Text style={styles.precoSectionTitle}>
              Preço máximo seguro para comprar
            </Text>
            <View style={styles.precoBox} wrap={false}>
              <Text style={styles.precoKicker}>Preço máximo seguro</Text>
              <Text style={styles.precoValor}>
                {ofertaMaxima !== null && Number.isFinite(ofertaMaxima)
                  ? formatarMoedaBRLExibicao(ofertaMaxima)
                  : "—"}
              </Text>
              <Text style={styles.precoHint}>
                Acima desse valor, você começa a perder dinheiro nessa compra.
              </Text>
              {baseVenda > 0 && Number.isFinite(baseVenda) ? (
                <Text style={styles.precoRef}>
                  Referência de venda realista considerada:{" "}
                  {formatarMoedaBRLExibicao(baseVenda)}
                </Text>
              ) : null}
            </View>
            <View style={styles.recoBox} wrap={false}>
              <Text style={styles.recoTitle}>Recomendação direta</Text>
              <Text style={styles.recoBody}>{microcopyDecisao.recomendacao}</Text>
            </View>
          </>
        ) : (
          <View style={styles.avisoMercado} wrap={false}>
            <Text>
              Inclua a referência de mercado na decisão na ferramenta para gerar
              lucro, limite sugerido e impacto de risco neste relatório.
            </Text>
          </View>
        )}

        <Text style={styles.rodapeFase}>
          Avaliador PRO · PDF nativo (fase 1: sem dossiê nem multas) · Texto
          selecionável · Não substitui vistoria nem documentação legal.
        </Text>
      </Page>
    </Document>
  );
}
