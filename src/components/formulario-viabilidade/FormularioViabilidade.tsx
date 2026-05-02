"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Calculator,
  ChevronDown,
  FileText,
  Gauge,
  Gavel,
  Percent,
  Tag,
  Truck,
  Wallet,
  Wrench,
} from "lucide-react";
import { salvarSimulacaoViabilidadeAction } from "@/actions/viabilidade-actions";
import { ExportReportButton } from "@/components/painel/ExportReportButton";
import { ExportReportButtonNativo } from "@/components/painel/ExportReportButtonNativo";
import {
  RelatorioAnalisePdf,
  type RelatorioVeiculoMeta,
} from "@/components/painel/RelatorioAnalisePdf";
import {
  extrairDebitosRenainfParaPdf,
  extrairLaudoTecnicoParaPdf,
} from "@/lib/api-v2/parsers";
import {
  blindagemCompletaJaAtiva,
  dadosLeilaoSemConsultasPremium,
  extrairRiscosCarregadosDeDadosLeilao,
  mergeFlagsComConsultasPremium,
} from "@/lib/consultas-risco-premium";
import { isPublicDemoMocksMode } from "@/lib/demo-mocks";
import { analisarTendenciaFipe, gerarInsightFipe } from "@/lib/fipe-tendencia";
import { isPlacaVeiculoDemonstracao } from "@/lib/placa-teste-demo";
import {
  calcularValorEvitarPerdaReais,
  impactoRiscoAgregado,
  resolverDecimaisImpactoDeSimulacao,
} from "@/lib/valor-evitar-perda";
import {
  calcularAlertasDesvioVendaEsperadaFipe,
  calcularCenarioPessimista,
  isLucroDesejadoElevado,
} from "@/lib/viabilidade-formulario-calculos";
import {
  AJUSTE_FIPE_PCT_MAX,
  AJUSTE_FIPE_PCT_MIN,
  calcularSimulacaoBase,
  calcularViabilidade,
  GORDURA_NEGOCIACAO_PADRAO,
  MAX_CENTAVOS_MOEDA,
  parseValorBRL,
  type EntradasViabilidade,
  simulacaoFromJSON,
  vereditoDadosCompletosParaSemaforo,
} from "@/lib/viabilidade";
import { AlertasDecisao } from "./AlertasDecisao";
import { AlertasHistoricoVeiculo } from "./AlertasHistoricoVeiculo";
import { BlocoDecisaoMercadoPendente } from "./BlocoDecisao";
import { BlindagemConversionCard } from "@/components/blindagem/BlindagemConversionCard";
import { CalculationDetailsAccordion } from "./CalculationDetailsAccordion";
import { CardEstrategiaNegociacao } from "./CardEstrategiaNegociacao";
import { CardSimulacaoBase } from "./CardSimulacaoBase";
import {
  CampoMonetarioMascarado,
  CampoPercentualEditavel,
} from "./campos-ui";
import { DEBOUNCE_MS, PCT_PADRAO } from "./constants";
import { ConsultasRiscoPremiumSection } from "./ConsultasRiscoPremiumSection";
import { DecisionCard } from "./DecisionCard";
import { extrairFlagsHistoricoVeiculo, FATORES_RISCO } from "./historico-veiculo";
import {
  inferirFipeMercadoAtivoNoHistorico,
  resultadoSemContextoFipeMercado,
  rotulosVeredito,
} from "./motor-viabilidade-ui";
import { ModalConsultaRiscoPremium } from "./ModalConsultaRiscoPremium";
import { PainelValoresMercado } from "./PainelValoresMercado";
import { RefinementPanel } from "./RefinementPanel";
import { ResumoDecisao } from "./ResumoDecisao";
import { arredondarReais2Ui } from "./ui-utils";

export function FormularioViabilidade({
  placa,
  fipeReferenciaTexto,
  simulacaoJson,
  dadosLeilaoJson = null,
  identificadorCliente,
  creditosPremium,
  planoAtivo,
  onDadosLeilaoAtualizado,
  relatorioVeiculo = null,
}: {
  placa: string;
  /** Valor textual da referência de mercado da análise — não é preço absoluto de venda. */
  fipeReferenciaTexto: string;
  simulacaoJson: unknown;
  dadosLeilaoJson?: unknown;
  identificadorCliente: string;
  creditosPremium: number;
  planoAtivo: boolean;
  onDadosLeilaoAtualizado?: (dadosLeilao: Record<string, unknown>) => void;
  /** Metadados do veículo para o bloco exportável em PDF (painel). */
  relatorioVeiculo?: RelatorioVeiculoMeta | null;
}) {
  const inicial = simulacaoFromJSON(simulacaoJson);

  const reaisParaCentavos = (r: number | undefined) => {
    const x = r ?? 0;
    if (!Number.isFinite(x)) return 0;
    return Math.min(MAX_CENTAVOS_MOEDA, Math.max(0, Math.round(x * 100)));
  };

  const [precoPedidoCentavos, setPrecoPedidoCentavos] = useState(() =>
    reaisParaCentavos(inicial?.precoPedido)
  );
  const [reparosCentavos, setReparosCentavos] = useState(() =>
    reaisParaCentavos(inicial?.reparos)
  );
  const [transporteCentavos, setTransporteCentavos] = useState(() =>
    reaisParaCentavos(inicial?.transporte)
  );
  const [documentacaoCentavos, setDocumentacaoCentavos] = useState(() =>
    reaisParaCentavos(inicial?.documentacao)
  );
  const [multasDebitosCentavos, setMultasDebitosCentavos] = useState(() =>
    reaisParaCentavos(inicial?.multasDebitosManual)
  );
  const [outrosCustosCentavos, setOutrosCustosCentavos] = useState(() =>
    reaisParaCentavos(inicial?.outrosCustos)
  );
  const [precoVendaEsperadoCentavos, setPrecoVendaEsperadoCentavos] = useState(
    () => reaisParaCentavos(inicial?.precoVendaEsperado)
  );
  const [pctLucro, setPctLucro] = useState(
    inicial?.pctLucroDesejado ?? PCT_PADRAO
  );
  const [pctGordura, setPctGordura] = useState(
    inicial?.pctGorduraNegociacao ?? GORDURA_NEGOCIACAO_PADRAO
  );
  const [ajusteFipePct, setAjusteFipePct] = useState(
    inicial?.ajusteFipePct ?? 0
  );
  /** % de impacto sobre a FIPE quando o histórico indica risco (editável). */
  const [pctImpactoLeilao, setPctImpactoLeilao] = useState(() =>
    inicial?.percentualLeilao != null && Number.isFinite(inicial.percentualLeilao)
      ? inicial.percentualLeilao
      : Math.round(FATORES_RISCO.leilao * 100)
  );
  const [pctImpactoSinistro, setPctImpactoSinistro] = useState(() =>
    inicial?.percentualSinistro != null &&
    Number.isFinite(inicial.percentualSinistro)
      ? inicial.percentualSinistro
      : Math.round(FATORES_RISCO.sinistro * 100)
  );
  const [pctImpactoRoubo, setPctImpactoRoubo] = useState(() =>
    inicial?.percentualRoubo != null && Number.isFinite(inicial.percentualRoubo)
      ? inicial.percentualRoubo
      : Math.round(FATORES_RISCO.roubo * 100)
  );
  const [pctImpactoGravame, setPctImpactoGravame] = useState(() =>
    inicial?.percentualGravame != null &&
    Number.isFinite(inicial.percentualGravame)
      ? inicial.percentualGravame
      : Math.round(FATORES_RISCO.gravame * 100)
  );
  const [formulasNegociacaoVisiveis, setFormulasNegociacaoVisiveis] =
    useState(false);
  /** Só para aviso de UI: consultas continuam clicáveis; resultado mock vem após “Já paguei”. */
  const sandboxPremiumAviso =
    isPublicDemoMocksMode() || isPlacaVeiculoDemonstracao(placa);

  const riscosCarregados = useMemo(
    () => extrairRiscosCarregadosDeDadosLeilao(dadosLeilaoJson),
    [dadosLeilaoJson]
  );
  const blindagemAtiva = useMemo(
    () => blindagemCompletaJaAtiva(dadosLeilaoJson),
    [dadosLeilaoJson]
  );
  const laudoTecnicoRiscos = useMemo(
    () => extrairLaudoTecnicoParaPdf(dadosLeilaoJson),
    [dadosLeilaoJson]
  );
  const debitosRenainfPdf = useMemo(
    () => extrairDebitosRenainfParaPdf(dadosLeilaoJson),
    [dadosLeilaoJson]
  );
  const [modalBlindagemAberta, setModalBlindagemAberta] = useState(false);
  const [consultandoBlindagem, setConsultandoBlindagem] = useState(false);
  const [mostrarAnaliseCompleta, setMostrarAnaliseCompleta] = useState(false);
  const [erroConsultaRisco, setErroConsultaRisco] = useState<string | null>(
    null
  );
  const [fipeCarregada, setFipeCarregada] = useState(() => {
    if (inferirFipeMercadoAtivoNoHistorico(simulacaoJson)) return true;
    const ref = parseValorBRL(fipeReferenciaTexto);
    return Number.isFinite(ref) && ref > 0;
  });

  const entradas: EntradasViabilidade = {
    precoPedido: precoPedidoCentavos / 100,
    precoVendaEsperado: precoVendaEsperadoCentavos / 100,
    reparos: reparosCentavos / 100,
    transporte: transporteCentavos / 100,
    documentacao: documentacaoCentavos / 100,
    multasDebitosManual: multasDebitosCentavos / 100,
    outrosCustos: outrosCustosCentavos / 100,
    pctLucroDesejado: pctLucro,
    pctGorduraNegociacao: pctGordura,
    ajusteFipePct,
  };

  const simBase = calcularSimulacaoBase(entradas);
  const fipeReferenciaConsulta = parseValorBRL(fipeReferenciaTexto);
  const fipeDisponivelNaConsulta =
    Number.isFinite(fipeReferenciaConsulta) && fipeReferenciaConsulta > 0;

  const contextoFipeMercadoAtivo =
    fipeCarregada && fipeDisponivelNaConsulta;

  const precoVendaEsperadoReais = precoVendaEsperadoCentavos / 100;
  const {
    alertaVendaAcimaMercado,
    alertaVendaAbaixoMercado,
  } = calcularAlertasDesvioVendaEsperadaFipe({
    fipeDisponivelNaConsulta,
    precoVendaEsperadoReais,
    fipeReferenciaConsulta,
  });

  const fipeReferenciaReais = contextoFipeMercadoAtivo
    ? fipeReferenciaConsulta
    : NaN;

  const flagsHistorico = mergeFlagsComConsultasPremium(
    extrairFlagsHistoricoVeiculo(dadosLeilaoSemConsultasPremium(dadosLeilaoJson)),
    riscosCarregados
  );
  const tendenciaFipeMercado = useMemo(() => {
    const root =
      dadosLeilaoJson && typeof dadosLeilaoJson === "object"
        ? (dadosLeilaoJson as Record<string, unknown>)
        : null;
    const historico = root?.historico_fipe_12m;
    if (!historico || typeof historico !== "object") return null;
    const analise = analisarTendenciaFipe(
      historico as Record<string, unknown>
    );
    if (!analise) return null;
    return {
      ...analise,
      insight: gerarInsightFipe(analise.tendencia, analise.variacaoPercentual),
    };
  }, [dadosLeilaoJson]);
  const temRiscoEstrutural =
    flagsHistorico.leilao ||
    flagsHistorico.sinistro ||
    flagsHistorico.roubo ||
    flagsHistorico.gravame;

  const fipeValidaParaAjuste =
    Number.isFinite(fipeReferenciaReais) && fipeReferenciaReais > 0;
  const ajusteFipePctClamped = Math.max(
    AJUSTE_FIPE_PCT_MIN,
    Math.min(
      AJUSTE_FIPE_PCT_MAX,
      Number.isFinite(ajusteFipePct) ? ajusteFipePct : 0
    )
  );

  const simulacaoViabilidadeParaRoi = {
    ajusteFipePct: ajusteFipePctClamped,
    percentualLeilao: pctImpactoLeilao,
    percentualSinistro: pctImpactoSinistro,
    percentualRoubo: pctImpactoRoubo,
    percentualGravame: pctImpactoGravame,
  };

  const decimaisImpactoHistorico = resolverDecimaisImpactoDeSimulacao(
    simulacaoViabilidadeParaRoi
  );
  const { bruto: impactoTotalBruto, comTeto: impactoTotal } =
    impactoRiscoAgregado(flagsHistorico, decimaisImpactoHistorico);
  const ajusteFipeDecimal = ajusteFipePctClamped / 100;
  const ajusteTotalMercadoUi = ajusteFipeDecimal + impactoTotal;

  const vendaRealistaBruta = fipeValidaParaAjuste
    ? Math.max(0, fipeReferenciaReais * (1 + ajusteTotalMercadoUi))
    : simBase.precoVendaSugerido;

  /** MIN(venda esperada, FIPE ajustada por risco) quando o contexto FIPE está ativo. */
  const baseVendaDecisaoRaw =
    contextoFipeMercadoAtivo && fipeValidaParaAjuste
      ? precoVendaEsperadoReais > 0
        ? Math.min(precoVendaEsperadoReais, vendaRealistaBruta)
        : vendaRealistaBruta
      : vendaRealistaBruta;

  const resultadoBruto = contextoFipeMercadoAtivo
    ? calcularViabilidade(entradas, fipeReferenciaTexto, {
        vendaRealistaReais: baseVendaDecisaoRaw,
      })
    : resultadoSemContextoFipeMercado(entradas);

  const resultado = resultadoBruto;

  const baseVendaDecisao = arredondarReais2Ui(Math.max(0, baseVendaDecisaoRaw));

  const omRes = resultado.ofertaMaximaSugerida;
  const oiRes = resultado.ofertaInicialAncoragem;
  let ofertaMaximaExibicao = omRes;
  let ofertaInicialExibicao = oiRes;
  if (
    contextoFipeMercadoAtivo &&
    omRes !== null &&
    baseVendaDecisao > 0 &&
    omRes > baseVendaDecisao
  ) {
    ofertaMaximaExibicao = baseVendaDecisao;
    if (oiRes !== null && omRes > 0) {
      ofertaInicialExibicao = arredondarReais2Ui(
        Math.max(0, (oiRes * baseVendaDecisao) / omRes)
      );
    }
  }

  const valorEvitarPerdaReaisExibicao =
    calcularValorEvitarPerdaReais({
      fipeTexto: fipeReferenciaTexto,
      dadosLeilao: (dadosLeilaoJson ?? null) as Record<string, unknown> | null,
      simulacaoViabilidade: simulacaoViabilidadeParaRoi,
    }) ?? 0;
  const perdaHistoricoReais =
    blindagemAtiva && fipeValidaParaAjuste ? valorEvitarPerdaReaisExibicao : 0;

  const vendaFipeAjustadaArredondada = arredondarReais2Ui(
    Math.max(0, vendaRealistaBruta)
  );

  const estimativaPerdaIndicativaReais = fipeValidaParaAjuste
    ? Math.max(0, Math.round(fipeReferenciaReais * 0.18))
    : 0;

  const primeiraExecucao = useRef(true);
  useEffect(() => {
    if (primeiraExecucao.current) {
      primeiraExecucao.current = false;
      return;
    }
    if (!planoAtivo || !identificadorCliente.trim()) return;
    const t = window.setTimeout(() => {
      void salvarSimulacaoViabilidadeAction({
        placa,
        fipeReferenciaTexto,
        identificadorCliente,
        incluirContextoFipeMercado: contextoFipeMercadoAtivo,
        precoPedido: precoPedidoCentavos / 100,
        precoVendaEsperado: precoVendaEsperadoCentavos / 100,
        reparos: reparosCentavos / 100,
        transporte: transporteCentavos / 100,
        documentacao: documentacaoCentavos / 100,
        multasDebitosManual: multasDebitosCentavos / 100,
        outrosCustos: outrosCustosCentavos / 100,
        pctLucroDesejado: pctLucro,
        pctGorduraNegociacao: pctGordura,
        ajusteFipePct,
        vendaRealistaReais: contextoFipeMercadoAtivo
          ? baseVendaDecisao
          : null,
        percentualLeilao: pctImpactoLeilao,
        percentualSinistro: pctImpactoSinistro,
        percentualRoubo: pctImpactoRoubo,
        percentualGravame: pctImpactoGravame,
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [
    placa,
    fipeReferenciaTexto,
    precoPedidoCentavos,
    precoVendaEsperadoCentavos,
    reparosCentavos,
    transporteCentavos,
    documentacaoCentavos,
    multasDebitosCentavos,
    outrosCustosCentavos,
    pctLucro,
    pctGordura,
    ajusteFipePct,
    pctImpactoLeilao,
    pctImpactoSinistro,
    pctImpactoRoubo,
    pctImpactoGravame,
    contextoFipeMercadoAtivo,
    baseVendaDecisao,
    planoAtivo,
    identificadorCliente,
  ]);

  useEffect(() => {
    if (!modalBlindagemAberta) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalBlindagemAberta(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalBlindagemAberta]);

  const semaforoCompleto = vereditoDadosCompletosParaSemaforo(entradas, {
    contextoFipeMercadoAtivo,
    vendaRealistaReais: baseVendaDecisaoRaw,
  });
  const vereditoUi = semaforoCompleto ? resultado.veredito : "indefinido";
  const metaUi = rotulosVeredito[vereditoUi];

  const custosOperacionaisZerados =
    reparosCentavos === 0 &&
    transporteCentavos === 0 &&
    documentacaoCentavos === 0 &&
    multasDebitosCentavos === 0 &&
    outrosCustosCentavos === 0;

  const riscoEstruturalLeilaoOuSinistro =
    blindagemAtiva &&
    contextoFipeMercadoAtivo &&
    (flagsHistorico.leilao || flagsHistorico.sinistro);

  const margemFinanceiraAguardandoCustos =
    blindagemAtiva &&
    contextoFipeMercadoAtivo &&
    custosOperacionaisZerados;

  const temNegociacao =
    ofertaMaximaExibicao !== null && ofertaInicialExibicao !== null;

  const lucroElevado = isLucroDesejadoElevado(pctLucro);

  const baseVenda = baseVendaDecisao;

  const vendaAbaixoDaFipe =
    Number.isFinite(fipeReferenciaReais) &&
    fipeReferenciaReais > 0 &&
    baseVenda < fipeReferenciaReais;

  const { custoPessimista, vendaPessimista } = calcularCenarioPessimista(
    resultado.custoTotal,
    baseVenda,
    temRiscoEstrutural
  );
  const lucroPessimista = vendaPessimista - custoPessimista;
  const margemPessimistaPct =
    custoPessimista > 0
      ? (lucroPessimista / custoPessimista) * 100
      : null;

  const prejuizoPessimista = lucroPessimista < 0;
  const lucroBase =
    !contextoFipeMercadoAtivo &&
    simBase.modo === "market_minus" &&
    simBase.lucroEstimado !== null
      ? simBase.lucroEstimado
      : baseVenda - resultado.custoTotal;

  const precoPedidoReais = precoPedidoCentavos / 100;
  const ofertaMaximaNum = ofertaMaximaExibicao ?? 0;
  const deltaNegociacao = precoPedidoReais - ofertaMaximaNum;
  const diferencaParaTeto = deltaNegociacao;
  const acimaDoTeto = deltaNegociacao > 0;

  const pedidoAcimaDoTetoSeguro =
    acimaDoTeto && precoPedidoReais > 0 && temNegociacao;

  const custosFixosReais =
    reparosCentavos / 100 +
    transporteCentavos / 100 +
    documentacaoCentavos / 100 +
    multasDebitosCentavos / 100 +
    outrosCustosCentavos / 100;
  const lucroIdealSimulado =
    ofertaMaximaExibicao !== null
      ? baseVenda - (ofertaMaximaExibicao + custosFixosReais)
      : null;

  const margemRealMercadoVsFipePct =
    fipeValidaParaAjuste && fipeReferenciaReais > 0
      ? ((baseVenda - fipeReferenciaReais) / fipeReferenciaReais) * 100
      : null;

  const exibirLinhasLucroCenario =
    resultado.custoTotal > 0 &&
    Number.isFinite(lucroBase) &&
    Number.isFinite(lucroPessimista);

  const exibirComparativoNegociacao = temNegociacao;

  const exibirBlocoResumo =
    exibirLinhasLucroCenario || exibirComparativoNegociacao;

  const alertaPrejuizoCombinado =
    prejuizoPessimista || pedidoAcimaDoTetoSeguro;

  const resumoComRiscoVisual =
    (exibirLinhasLucroCenario && prejuizoPessimista) ||
    pedidoAcimaDoTetoSeguro;

  const tetoVisual = ofertaMaximaExibicao;
  const maxBarRef =
    tetoVisual !== null && Number.isFinite(tetoVisual)
      ? Math.max(precoPedidoReais, tetoVisual, 1)
      : 1;
  const pctBarTeto =
    tetoVisual !== null && maxBarRef > 0
      ? Math.min(100, (tetoVisual / maxBarRef) * 100)
      : 0;
  const pctBarPedido =
    precoPedidoReais > 0 && maxBarRef > 0
      ? Math.min(100, (precoPedidoReais / maxBarRef) * 100)
      : 0;

  return (
    <div
      className="relative mx-auto min-w-0 max-w-md space-y-9 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white px-4 py-7 shadow-xl shadow-slate-200/30 sm:max-w-3xl sm:space-y-12 sm:px-8 sm:py-8"
      data-testid="formulario-viabilidade"
    >
      {!planoAtivo ? (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-3xl bg-white/95 p-8 text-center shadow-inner backdrop-blur-sm"
          data-testid="overlay-plano-inativo"
        >
          <p className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Acesso exclusivo para assinantes Avaliador PRO
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-slate-600">
            Esta é uma ferramenta profissional para decisão de compra de veículos.
          </p>
          <Link
            href="/#planos"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Assinar plano
          </Link>
        </div>
      ) : null}

      <div className={!planoAtivo ? "pointer-events-none select-none opacity-40" : undefined}>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <Calculator className="size-6" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Sua decisão em reais
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              {contextoFipeMercadoAtivo
                ? "Você decide aqui se compra ou não compra."
                : fipeDisponivelNaConsulta
                  ? "Ative FIPE na decisão para ver preço máximo agora."
                  : "Sem FIPE válida, não dá para calcular o preço máximo seguro."}
            </p>
          </div>
        </div>
      </div>

      {!fipeDisponivelNaConsulta ? <BlocoDecisaoMercadoPendente /> : null}

      {fipeDisponivelNaConsulta && contextoFipeMercadoAtivo ? (
        <div className="mt-4 space-y-10 sm:space-y-12">
          <DecisionCard
            contextoAtivo={contextoFipeMercadoAtivo}
            blindagemAtiva={blindagemAtiva}
            vereditoUi={vereditoUi}
            semaforoCompleto={semaforoCompleto}
            riscoEstruturalLeilaoOuSinistro={riscoEstruturalLeilaoOuSinistro}
            margemFinanceiraAguardandoCustos={margemFinanceiraAguardandoCustos}
            lucroEstimadoReais={
              semaforoCompleto ? resultado.lucroProjetadoMargem : null
            }
            margemPct={
              semaforoCompleto ? resultado.margemRealProjecaoPct : null
            }
            tetoNegociacaoReais={temNegociacao ? ofertaMaximaExibicao : null}
            perdaHistoricoReais={perdaHistoricoReais}
            riscosResumo={[
              flagsHistorico.leilao ? "Leilão" : "",
              flagsHistorico.sinistro ? "Sinistro" : "",
              flagsHistorico.roubo ? "Roubo" : "",
              flagsHistorico.gravame ? "Gravame" : "",
            ].filter(Boolean)}
            tendenciaMercado={tendenciaFipeMercado}
          />
          <BlindagemConversionCard
            contextoAtivo={contextoFipeMercadoAtivo}
            blindagemAtiva={blindagemAtiva}
            vereditoUi={vereditoUi}
            temRiscoEstrutural={temRiscoEstrutural}
            podeAtivarPorSaldo={sandboxPremiumAviso || creditosPremium > 0}
            consultandoBlindagem={consultandoBlindagem}
            riscoEstimadoReais={estimativaPerdaIndicativaReais}
            perdaEvitadaReais={perdaHistoricoReais}
            onAbrirModalBlindagem={() => {
              setErroConsultaRisco(null);
              setModalBlindagemAberta(true);
            }}
          />
        </div>
      ) : null}

      <RefinementPanel>
        <CampoMonetarioMascarado
          id="reparos"
          label="Reparos / peças"
          legenda="Tudo o que será gasto para deixar o carro pronto para venda."
          valueCentavos={reparosCentavos}
          onChangeCentavos={setReparosCentavos}
          icon={Wrench}
        />
        <CampoMonetarioMascarado
          id="transporte"
          label="Transporte"
          legenda="Frete e deslocamento até o pátio."
          valueCentavos={transporteCentavos}
          onChangeCentavos={setTransporteCentavos}
          icon={Truck}
        />
        <CampoMonetarioMascarado
          id="documentacao"
          label="Documentação"
          legenda="Taxas e custos de transferência e papelada."
          valueCentavos={documentacaoCentavos}
          onChangeCentavos={setDocumentacaoCentavos}
          icon={FileText}
        />
        <CampoMonetarioMascarado
          id="multas-debitos-manual"
          label="Multas e débitos (manual)"
          legenda="Informe o total estimado (ex.: multas Renainf, taxas extras). Esse valor entra no limite sugerido (não pague mais que) e na margem — não dispara consultas automáticas."
          valueCentavos={multasDebitosCentavos}
          onChangeCentavos={setMultasDebitosCentavos}
          icon={Gavel}
        />
        <CampoMonetarioMascarado
          id="outros-custos"
          label="Outros custos"
          legenda="Comissão, garantia, custo de pátio e imprevistos."
          valueCentavos={outrosCustosCentavos}
          onChangeCentavos={setOutrosCustosCentavos}
          icon={Wallet}
        />
        <CampoMonetarioMascarado
          id="preco-venda-esperado"
          label="Preço de venda esperado"
          legenda="Por quanto você acredita que consegue vender este carro? Se informado, calculamos quanto pode pagar na compra (simulação market-minus). Deixe vazio para usar só custos + lucro %."
          valueCentavos={precoVendaEsperadoCentavos}
          onChangeCentavos={setPrecoVendaEsperadoCentavos}
          icon={Tag}
        />
        {alertaVendaAcimaMercado ? (
          <div
            role="note"
            data-testid="alerta-venda-acima-mercado"
            className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm font-medium leading-snug text-amber-950"
          >
            ⚠️ Valor de venda acima do mercado. Verifique se este preço é realista.
          </div>
        ) : null}
        {alertaVendaAbaixoMercado ? (
          <div
            role="note"
            data-testid="alerta-venda-abaixo-mercado"
            className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm font-medium leading-snug text-amber-950"
          >
            ⚠️ Valor de venda muito abaixo do mercado. Você pode estar perdendo margem.
          </div>
        ) : null}

        <CampoPercentualEditavel
          id="pct-lucro"
          label="Margem desejada — lucro (%)"
          legenda="Com preço de venda esperado preenchido: lucro desejado sobre o investimento total (compra do veículo + custos operacionais). Sem venda esperada: lucro só sobre os custos operacionais (modo custo + margem)."
          hint={`Padrão sugerido: ${PCT_PADRAO}%`}
          valueNum={pctLucro}
          onCommit={setPctLucro}
          max={500}
          testId="viabilidade-pct-lucro"
          icon={Percent}
        />

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
          <CampoMonetarioMascarado
            id="preco-pedido"
            label="Preço pedido pelo vendedor"
            legenda="O que o vendedor está pedindo — não entra no custo total nem no limite sugerido; serve para comparar com o valor acima da decisão."
            valueCentavos={precoPedidoCentavos}
            onChangeCentavos={setPrecoPedidoCentavos}
            icon={Banknote}
          />
        </div>
      </RefinementPanel>

      {!contextoFipeMercadoAtivo ? (
        <CardSimulacaoBase
          simBase={simBase}
          pctLucro={pctLucro}
          fipeDisponivelNaConsulta={fipeDisponivelNaConsulta}
          onIncluirFipeMercado={() => setFipeCarregada(true)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setFipeCarregada(false)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          data-testid="btn-voltar-simulacao-base"
        >
          Voltar à simulação só com custos (ocultar FIPE da decisão)
        </button>
      )}

      <AlertasDecisao
        alertaPrejuizoCombinado={alertaPrejuizoCombinado}
        pedidoAcimaDoTetoSeguro={pedidoAcimaDoTetoSeguro}
        prejuizoPessimista={prejuizoPessimista}
        diferencaParaTeto={diferencaParaTeto}
        lucroElevado={lucroElevado}
        vendaAbaixoDaFipe={vendaAbaixoDaFipe}
      />

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setMostrarAnaliseCompleta((v) => !v)}
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          data-testid="btn-toggle-analise-completa"
        >
          {mostrarAnaliseCompleta ? "Ocultar análise completa" : "Ver análise completa"}
        </button>
      </div>

      {mostrarAnaliseCompleta ? (
      <CalculationDetailsAccordion>
        <details
          className="group min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100 open:border-indigo-200/90 open:ring-indigo-100 [&_summary::-webkit-details-marker]:hidden"
          data-testid="details-ajustar-estrategia"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-left">
            <span className="text-sm font-semibold text-slate-800">
              Ajustar referência FIPE e riscos (avançado)
            </span>
            <span className="flex items-center gap-2 text-xs text-slate-500">
              FIPE, gordura e impactos %
              <ChevronDown
                className="size-5 shrink-0 text-slate-400 transition duration-200 group-open:rotate-180"
                strokeWidth={2}
              />
            </span>
          </summary>
          <div className="flex flex-col gap-4 border-t border-slate-100 p-4 pt-4">
            <CampoPercentualEditavel
              id="ajuste-fipe"
              label="Ajuste sobre FIPE"
              legenda="Use negativo para veículos que vendem abaixo da FIPE (ex: -10%)."
              hint="Esse ajuste reflete o preço real de mercado em relação à FIPE."
              valueNum={ajusteFipePct}
              onCommit={setAjusteFipePct}
              min={AJUSTE_FIPE_PCT_MIN}
              max={AJUSTE_FIPE_PCT_MAX}
              testId="viabilidade-ajuste-fipe"
              icon={Percent}
              iconWrapClassName="rounded-lg bg-sky-50 text-sky-700"
              esconderZeroNaExibicao={false}
            />
            <CampoPercentualEditavel
              id="pct-gordura-negociacao"
              label="Gordura para negociação"
              legenda="Margem para baixar o preço sem comprometer sua meta de lucro."
              hint={`Padrão sugerido: ${GORDURA_NEGOCIACAO_PADRAO}% · aplicado entre o limite sugerido e a oferta inicial`}
              valueNum={pctGordura}
              onCommit={setPctGordura}
              max={100}
              placeholder={String(GORDURA_NEGOCIACAO_PADRAO)}
              testId="viabilidade-pct-gordura"
              icon={Gauge}
              iconWrapClassName="rounded-lg bg-violet-50 text-violet-700"
              esconderZeroNaExibicao={false}
            />

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-xs font-bold text-slate-800">
                Impactos de histórico
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Quando a blindagem indicar risco, estes % reduzem a referência de
                venda realista (somados ao ajuste sobre FIPE). Padrão do sistema: −20,
                −15, −10 e −5.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-[11px] font-medium text-slate-700">
                  Leilão (%)
                  <input
                    type="number"
                    inputMode="numeric"
                    min={-100}
                    max={0}
                    step={1}
                    value={Number.isFinite(pctImpactoLeilao) ? pctImpactoLeilao : -20}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setPctImpactoLeilao(
                        Number.isFinite(n)
                          ? Math.max(-100, Math.min(0, n))
                          : -20
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 shadow-sm"
                    data-testid="impacto-historico-leilao"
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-700">
                  Sinistro (%)
                  <input
                    type="number"
                    inputMode="numeric"
                    min={-100}
                    max={0}
                    step={1}
                    value={
                      Number.isFinite(pctImpactoSinistro)
                        ? pctImpactoSinistro
                        : -15
                    }
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setPctImpactoSinistro(
                        Number.isFinite(n)
                          ? Math.max(-100, Math.min(0, n))
                          : -15
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 shadow-sm"
                    data-testid="impacto-historico-sinistro"
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-700">
                  Roubo / furto (%)
                  <input
                    type="number"
                    inputMode="numeric"
                    min={-100}
                    max={0}
                    step={1}
                    value={
                      Number.isFinite(pctImpactoRoubo) ? pctImpactoRoubo : -10
                    }
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setPctImpactoRoubo(
                        Number.isFinite(n)
                          ? Math.max(-100, Math.min(0, n))
                          : -10
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 shadow-sm"
                    data-testid="impacto-historico-roubo"
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-700">
                  Gravame (%)
                  <input
                    type="number"
                    inputMode="numeric"
                    min={-100}
                    max={0}
                    step={1}
                    value={
                      Number.isFinite(pctImpactoGravame)
                        ? pctImpactoGravame
                        : -5
                    }
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setPctImpactoGravame(
                        Number.isFinite(n)
                          ? Math.max(-100, Math.min(0, n))
                          : -5
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 shadow-sm"
                    data-testid="impacto-historico-gravame"
                  />
                </label>
              </div>
            </div>
          </div>
        </details>

        {contextoFipeMercadoAtivo &&
        temRiscoEstrutural &&
        vendaAbaixoDaFipe ? (
          <AlertasHistoricoVeiculo
            exibirLegendaMercadoReduzido
            impactoTotal={impactoTotal}
          />
        ) : null}

        <ResumoDecisao
          exibirBlocoResumo={exibirBlocoResumo}
          resumoComRiscoVisual={resumoComRiscoVisual}
          fipeCarregada={contextoFipeMercadoAtivo}
          fipeValidaParaAjuste={fipeValidaParaAjuste}
          fipeReferenciaReais={fipeReferenciaReais}
          baseVenda={baseVenda}
          exibirComparativoNegociacao={exibirComparativoNegociacao}
          ofertaMaximaNum={ofertaMaximaNum}
          pctBarTeto={pctBarTeto}
          pctBarPedido={pctBarPedido}
          precoPedidoReais={precoPedidoReais}
          acimaDoTeto={acimaDoTeto}
          deltaNegociacao={deltaNegociacao}
          lucroIdealSimulado={lucroIdealSimulado}
          exibirLinhasLucroCenario={exibirLinhasLucroCenario}
          prejuizoPessimista={prejuizoPessimista}
          lucroBase={lucroBase}
          lucroPessimista={lucroPessimista}
          temRiscoEstrutural={temRiscoEstrutural}
          margemPessimistaPct={margemPessimistaPct}
        />

        <ConsultasRiscoPremiumSection
          creditosPremium={creditosPremium}
          riscosCarregados={riscosCarregados}
          blindagemAtiva={blindagemAtiva}
          dadosLeilaoJson={dadosLeilaoJson}
          sandboxPremiumAviso={sandboxPremiumAviso}
        />

        <AlertasHistoricoVeiculo
          exibirAlertaBaixaLiquidez={temRiscoEstrutural}
          impactoTotal={impactoTotal}
        />

        <CardEstrategiaNegociacao
          temNegociacao={temNegociacao}
          pctLucro={pctLucro}
          pctGordura={pctGordura}
          formulasNegociacaoVisiveis={formulasNegociacaoVisiveis}
          onToggleFormulas={() => setFormulasNegociacaoVisiveis((v) => !v)}
          fipeDisponivelNaConsulta={fipeDisponivelNaConsulta}
          fipeCarregada={contextoFipeMercadoAtivo}
        />

        <PainelValoresMercado
          temNegociacao={temNegociacao}
          resultado={resultado}
          simBase={simBase}
          fipeCarregada={contextoFipeMercadoAtivo}
          baseVenda={baseVenda}
          margemRealMercadoVsFipePct={margemRealMercadoVsFipePct}
          ofertaMaximaExibicao={ofertaMaximaExibicao}
          vendaFipeAjustadaReais={
            fipeValidaParaAjuste && contextoFipeMercadoAtivo
              ? vendaFipeAjustadaArredondada
              : null
          }
          formulaVendaRealista={
            fipeValidaParaAjuste && contextoFipeMercadoAtivo
              ? {
                  fipeRef: fipeReferenciaReais,
                  multiplicador: 1 + ajusteTotalMercadoUi,
                  ajustePct: ajusteFipePctClamped,
                  impactoRiscoDecimal: impactoTotal,
                  impactoRiscoBruto: impactoTotalBruto,
                  resultado: vendaFipeAjustadaArredondada,
                }
              : null
          }
        />
      </CalculationDetailsAccordion>
      ) : null}

      {relatorioVeiculo ? (
        <div className="space-y-3 rounded-2xl border border-cyan-200/70 bg-white p-4 shadow-sm ring-1 ring-cyan-100/80">
          <div className="pdf-exclude flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Relatório para negociação
              </p>
              <p className="text-xs text-slate-600">
                Exporte em PDF para anexar ou apresentar na mesa de negócio.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <ExportReportButton fileBaseName={`relatorio-${placa}`} />
              <ExportReportButtonNativo
                fileBaseName={`relatorio-${placa}`}
                dados={{
                  placa,
                  fipeTexto: fipeReferenciaTexto,
                  meta: relatorioVeiculo,
                  flagsRisco: flagsHistorico,
                  fipeReferenciaReais: fipeValidaParaAjuste
                    ? fipeReferenciaReais
                    : null,
                  baseVenda,
                  ofertaMaxima: ofertaMaximaExibicao,
                  contextoFipeMercadoAtivo,
                  blindagemAtiva,
                  riscoEstruturalLeilaoOuSinistro,
                  margemFinanceiraAguardandoCustos,
                  veredito: vereditoUi,
                  subtituloVeredito: metaUi.subtitulo,
                  perdaHistoricoReais,
                }}
              />
            </div>
          </div>
          <RelatorioAnalisePdf
            placa={placa}
            fipeTexto={fipeReferenciaTexto}
            meta={relatorioVeiculo}
            flagsRisco={flagsHistorico}
            fipeReferenciaReais={
              fipeValidaParaAjuste ? fipeReferenciaReais : null
            }
            baseVenda={baseVenda}
            ofertaMaxima={ofertaMaximaExibicao}
            contextoFipeMercadoAtivo={contextoFipeMercadoAtivo}
            blindagemAtiva={blindagemAtiva}
            riscoEstruturalLeilaoOuSinistro={riscoEstruturalLeilaoOuSinistro}
            margemFinanceiraAguardandoCustos={margemFinanceiraAguardandoCustos}
            veredito={vereditoUi}
            subtituloVeredito={metaUi.subtitulo}
            laudoTecnicoRiscos={laudoTecnicoRiscos}
            debitosRenainf={debitosRenainfPdf}
            margemRealProjecaoPct={
              semaforoCompleto &&
              (!blindagemAtiva || !margemFinanceiraAguardandoCustos)
                ? resultado.margemRealProjecaoPct
                : null
            }
            lucroEstimadoReais={
              semaforoCompleto &&
              (!blindagemAtiva || !margemFinanceiraAguardandoCustos)
                ? resultado.lucroProjetadoMargem
                : null
            }
            perdaHistoricoReais={perdaHistoricoReais}
          />
        </div>
      ) : null}

      <ModalConsultaRiscoPremium
        aberto={modalBlindagemAberta}
        placa={placa}
        identificadorCliente={identificadorCliente}
        consultando={consultandoBlindagem}
        erroConsultaRisco={erroConsultaRisco}
        onFechar={() => setModalBlindagemAberta(false)}
        onErro={setErroConsultaRisco}
        onInicioConsulta={() => setConsultandoBlindagem(true)}
        onFimConsulta={() => setConsultandoBlindagem(false)}
        onDadosLeilaoAtualizado={onDadosLeilaoAtualizado}
      />
      </div>
    </div>
  );
}
