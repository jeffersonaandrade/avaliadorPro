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
  /** Fase 2: mesma regra que o relatório HTML (já filtrada no formulário). */
  margemRealProjecaoPct?: number | null;
  lucroEstimadoReais?: number | null;
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
  riskBox: {
    backgroundColor: "#dc2626",
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
  },
  riskTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
  },
  riskBody: {
    fontSize: 9,
    color: "#fef2f2",
    textAlign: "center",
    lineHeight: 1.5,
    marginBottom: 8,
  },
  riskListItem: {
    fontSize: 9,
    color: "#ffffff",
    marginBottom: 4,
    paddingLeft: 8,
  },
  riskFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.25)",
    fontSize: 9,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 1.45,
  },
  lucroSection: {
    marginBottom: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  lucroTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 10,
  },
  lucroLine: {
    fontSize: 10,
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 1.45,
  },
  lucroStrong: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
  },
  perdaBox: {
    marginBottom: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 4,
    backgroundColor: "#fffbeb",
  },
  perdaTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#78350f",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  perdaBody: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#78350f",
    lineHeight: 1.5,
    marginBottom: 8,
  },
  strategyBox: {
    marginBottom: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  strategyTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
  },
  strategyHint: {
    fontSize: 9,
    color: "#475569",
    textAlign: "center",
    lineHeight: 1.45,
    marginBottom: 10,
  },
  strategyFaixa: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  strategyValor: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  strategyAte: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#64748b",
    marginHorizontal: 8,
  },
  strategyFoot: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#475569",
    textAlign: "center",
    lineHeight: 1.45,
    marginTop: 6,
  },
  strategyTeto: {
    fontSize: 8,
    color: "#475569",
    textAlign: "center",
    marginTop: 4,
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
  margemRealProjecaoPct = null,
  lucroEstimadoReais = null,
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

  const exibirLucro =
    lucroEstimadoReais !== null && Number.isFinite(lucroEstimadoReais);
  const exibirMargem =
    margemRealProjecaoPct !== null && Number.isFinite(margemRealProjecaoPct);
  const tetoNegociacaoOk =
    ofertaMaxima !== null &&
    Number.isFinite(ofertaMaxima) &&
    ofertaMaxima > 0;
  const sugestaoNegociacao = tetoNegociacaoOk
    ? {
        min: ofertaMaxima! * 0.9,
        max: ofertaMaxima! * 0.97,
        teto: ofertaMaxima!,
      }
    : null;

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
              Relatório de viabilidade (PDF nativo)
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

            {blindagemAtiva && riscoEstruturalLeilaoOuSinistro ? (
              <View style={styles.riskBox} wrap={false}>
                <Text style={styles.riskTitle}>Risco detectado nesse veículo</Text>
                <Text style={styles.riskBody}>
                  Esse veículo possui histórico que reduz o valor de mercado e
                  dificulta a revenda.
                </Text>
                <Text style={styles.riskListItem}>• Leilão</Text>
                <Text style={styles.riskListItem}>• Sinistro</Text>
                <Text style={styles.riskListItem}>• Roubo</Text>
                <Text style={styles.riskListItem}>• Gravame</Text>
                <Text style={styles.riskFooter}>
                  Esse tipo de veículo costuma vender mais barato e demorar mais.
                </Text>
              </View>
            ) : null}

            <View style={styles.lucroSection}>
              <Text style={styles.lucroTitle}>Quanto você pode lucrar</Text>
              <Text style={styles.lucroLine}>
                <Text style={{ color: "#64748b" }}>Lucro estimado na revenda: </Text>
                <Text style={styles.lucroStrong}>
                  {exibirLucro
                    ? formatarMoedaBRLExibicao(lucroEstimadoReais!)
                    : "—"}
                </Text>
              </Text>
              <Text style={styles.lucroLine}>
                <Text style={{ color: "#64748b" }}>Sua margem na revenda (%): </Text>
                <Text style={styles.lucroStrong}>
                  {exibirMargem
                    ? `${margemRealProjecaoPct!.toFixed(1).replace(".", ",")}%`
                    : "—"}
                </Text>
              </Text>
            </View>

            {exibirPerdaRisco ? (
              <View style={styles.perdaBox} wrap={false}>
                <Text style={styles.perdaTitle}>Valor que você deixou de perder</Text>
                <Text style={styles.perdaBody}>
                  Se você pagasse só pelo valor de tabela, poderia jogar fora cerca
                  de {formatarMoedaBRLExibicao(perdaHistoricoReais)} neste carro.
                </Text>
                <Text style={styles.perdaBody}>
                  Esta análise mostrou esse risco em reais antes de fechar o negócio.
                </Text>
              </View>
            ) : null}

            {sugestaoNegociacao ? (
              <View style={styles.strategyBox} wrap={false}>
                <Text style={styles.strategyTitle}>Estratégia na mesa de negociação</Text>
                <Text style={styles.strategyHint}>
                  Para manter uma margem segura, negocie este veículo entre:
                </Text>
                <View style={styles.strategyFaixa}>
                  <Text style={styles.strategyValor}>
                    {formatarMoedaBRLExibicao(sugestaoNegociacao.min)}
                  </Text>
                  <Text style={styles.strategyAte}>até</Text>
                  <Text style={styles.strategyValor}>
                    {formatarMoedaBRLExibicao(sugestaoNegociacao.max)}
                  </Text>
                </View>
                <Text style={styles.strategyFoot}>
                  Nunca ultrapasse o preço máximo seguro.
                </Text>
                <Text style={styles.strategyTeto}>
                  Teto de segurança:{" "}
                  {formatarMoedaBRLExibicao(sugestaoNegociacao.teto)}
                </Text>
              </View>
            ) : null}
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
          Avaliador PRO · PDF nativo (fase 2: lucro, risco, valor evitado e
          estratégia; sem dossiê nem multas) · Texto selecionável · Não substitui
          vistoria nem documentação legal.
        </Text>
      </Page>
    </Document>
  );
}
