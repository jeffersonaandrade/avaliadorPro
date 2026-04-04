"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Calculator,
  ChevronDown,
  FileText,
  Gauge,
  Percent,
  Tag,
  Truck,
  Wallet,
  Wrench,
} from "lucide-react";
import { salvarSimulacaoViabilidadeAction } from "@/actions/viabilidade-actions";
import {
  dadosLeilaoSemConsultasPremium,
  extrairRiscosCarregadosDeDadosLeilao,
  mergeFlagsComConsultasPremium,
  type TipoConsultaRiscoPremium,
} from "@/lib/consultas-risco-premium";
import { isPublicDemoMocksMode } from "@/lib/demo-mocks";
import { isPlacaVeiculoDemonstracao } from "@/lib/placa-teste-demo";
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
} from "@/lib/viabilidade";
import { AlertasDecisao } from "./AlertasDecisao";
import { AlertasHistoricoVeiculo } from "./AlertasHistoricoVeiculo";
import {
  BlocoDecisaoMercadoPendente,
  BlocoDecisaoPrincipal,
} from "./BlocoDecisao";
import { CardEstrategiaNegociacao } from "./CardEstrategiaNegociacao";
import { CardSimulacaoBase } from "./CardSimulacaoBase";
import {
  CampoMonetarioMascarado,
  CampoPercentualEditavel,
} from "./campos-ui";
import { DEBOUNCE_MS, PCT_PADRAO } from "./constants";
import { ConsultasRiscoPremiumSection } from "./ConsultasRiscoPremiumSection";
import { extrairFlagsHistoricoVeiculo, FATORES_RISCO } from "./historico-veiculo";
import {
  inferirFipeMercadoAtivoNoHistorico,
  resultadoSemContextoFipeMercado,
  rotulosVeredito,
} from "./motor-viabilidade-ui";
import { ModalConsultaRiscoPremium } from "./ModalConsultaRiscoPremium";
import { PainelValoresMercado } from "./PainelValoresMercado";
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
  const [formulasNegociacaoVisiveis, setFormulasNegociacaoVisiveis] =
    useState(false);
  /** Só para aviso de UI: consultas continuam clicáveis; resultado mock vem após “Já paguei”. */
  const sandboxPremiumAviso =
    isPublicDemoMocksMode() || isPlacaVeiculoDemonstracao(placa);

  const riscosCarregados = useMemo(
    () => extrairRiscosCarregadosDeDadosLeilao(dadosLeilaoJson),
    [dadosLeilaoJson]
  );
  const [modalConsultaRiscoPix, setModalConsultaRiscoPix] = useState<{
    tipo: TipoConsultaRiscoPremium;
    precoLabel: string;
  } | null>(null);
  const [consultandoRiscoTipo, setConsultandoRiscoTipo] =
    useState<TipoConsultaRiscoPremium | null>(null);
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

  const resultado = contextoFipeMercadoAtivo
    ? calcularViabilidade(entradas, fipeReferenciaTexto)
    : resultadoSemContextoFipeMercado(entradas);

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
        outrosCustos: outrosCustosCentavos / 100,
        pctLucroDesejado: pctLucro,
        pctGorduraNegociacao: pctGordura,
        ajusteFipePct,
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
    outrosCustosCentavos,
    pctLucro,
    pctGordura,
    ajusteFipePct,
    contextoFipeMercadoAtivo,
    planoAtivo,
    identificadorCliente,
  ]);

  useEffect(() => {
    if (!modalConsultaRiscoPix) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalConsultaRiscoPix(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalConsultaRiscoPix]);

  const { veredito } = resultado;
  const meta = rotulosVeredito[veredito];
  const fipeReferenciaReais = contextoFipeMercadoAtivo
    ? fipeReferenciaConsulta
    : NaN;

  const temNegociacao =
    resultado.ofertaMaximaSugerida !== null &&
    resultado.ofertaInicialAncoragem !== null;

  const lucroElevado = isLucroDesejadoElevado(pctLucro);

  const flagsHistorico = mergeFlagsComConsultasPremium(
    extrairFlagsHistoricoVeiculo(dadosLeilaoSemConsultasPremium(dadosLeilaoJson)),
    riscosCarregados
  );
  const temRiscoEstrutural =
    flagsHistorico.leilao ||
    flagsHistorico.sinistro ||
    flagsHistorico.roubo ||
    flagsHistorico.gravame;

  const impactoTotalBruto =
    (flagsHistorico.leilao ? FATORES_RISCO.leilao : 0) +
    (flagsHistorico.sinistro ? FATORES_RISCO.sinistro : 0) +
    (flagsHistorico.roubo ? FATORES_RISCO.roubo : 0) +
    (flagsHistorico.gravame ? FATORES_RISCO.gravame : 0);

  const impactoTotal = Math.max(-0.5, impactoTotalBruto);

  const fipeValidaParaAjuste =
    Number.isFinite(fipeReferenciaReais) && fipeReferenciaReais > 0;
  const ajusteFipePctClamped = Math.max(
    AJUSTE_FIPE_PCT_MIN,
    Math.min(
      AJUSTE_FIPE_PCT_MAX,
      Number.isFinite(ajusteFipePct) ? ajusteFipePct : 0
    )
  );
  const ajusteFipeDecimal = ajusteFipePctClamped / 100;
  const ajusteTotalMercadoUi = ajusteFipeDecimal + impactoTotal;

  const vendaRealista = fipeValidaParaAjuste
    ? Math.max(0, fipeReferenciaReais * (1 + ajusteTotalMercadoUi))
    : resultado.precoVendaSugerido;

  const baseVenda = Math.max(0, arredondarReais2Ui(vendaRealista));

  const vendaUltrapassaFipe =
    Number.isFinite(fipeReferenciaReais) &&
    fipeReferenciaReais > 0 &&
    baseVenda > fipeReferenciaReais;

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
  const ofertaMaximaNum = resultado.ofertaMaximaSugerida ?? 0;
  const deltaNegociacao = precoPedidoReais - ofertaMaximaNum;
  const diferencaParaTeto = deltaNegociacao;
  const acimaDoTeto = deltaNegociacao > 0;

  const pedidoAcimaDoTetoSeguro =
    acimaDoTeto && precoPedidoReais > 0 && temNegociacao;

  const custosFixosReais =
    reparosCentavos / 100 +
    transporteCentavos / 100 +
    documentacaoCentavos / 100 +
    outrosCustosCentavos / 100;
  const lucroIdealSimulado =
    resultado.ofertaMaximaSugerida !== null
      ? baseVenda - (resultado.ofertaMaximaSugerida + custosFixosReais)
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

  const tetoVisual = resultado.ofertaMaximaSugerida;
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
      className="relative mx-auto min-w-0 max-w-full space-y-6 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-6 shadow-xl shadow-slate-200/30 sm:max-w-3xl sm:p-8"
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
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Assinar plano
          </Link>
        </div>
      ) : null}

      <div className={!planoAtivo ? "pointer-events-none select-none opacity-40" : undefined}>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <Calculator className="size-6" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              Ferramenta de decisão
            </h3>
            <p className="text-xs text-slate-600">
              {contextoFipeMercadoAtivo
                ? "Custos operacionais definem o teto seguro · compare com o preço pedido pelo vendedor"
                : fipeDisponivelNaConsulta
                  ? "Simule custos e lucro; inclua a referência de mercado na decisão quando quiser ver teto e veredito."
                  : "Simule custos e lucro; quando a referência vier na análise, inclua na decisão para ver teto, ofertas e veredito."}
            </p>
          </div>
        </div>
      </div>

      <AlertasHistoricoVeiculo
        temRiscoEstrutural={temRiscoEstrutural}
        impactoTotal={impactoTotal}
      />

      <div className="flex min-w-0 flex-col gap-4">
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

        <details
          className="group min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100 open:border-indigo-200/90 open:ring-indigo-100 [&_summary::-webkit-details-marker]:hidden"
          data-testid="details-ajustar-estrategia"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-left">
            <span className="text-sm font-semibold text-slate-800">
              Ajustar estratégia
            </span>
            <span className="flex items-center gap-2 text-xs text-slate-500">
              FIPE, lucro e gordura
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
              id="pct-lucro"
              label="Lucro desejado (%)"
              legenda="Com preço de venda esperado preenchido: lucro desejado sobre o investimento total (compra do veículo + custos operacionais). Sem venda esperada: lucro só sobre os custos operacionais (modo custo + margem)."
              hint={`Padrão sugerido: ${PCT_PADRAO}%`}
              valueNum={pctLucro}
              onCommit={setPctLucro}
              max={500}
              testId="viabilidade-pct-lucro"
              icon={Percent}
            />
            <CampoPercentualEditavel
              id="pct-gordura-negociacao"
              label="Gordura para negociação"
              legenda="Margem para baixar o preço sem comprometer sua meta de lucro."
              hint={`Padrão sugerido: ${GORDURA_NEGOCIACAO_PADRAO}% · aplicado entre o teto e a oferta inicial`}
              valueNum={pctGordura}
              onCommit={setPctGordura}
              max={100}
              placeholder={String(GORDURA_NEGOCIACAO_PADRAO)}
              testId="viabilidade-pct-gordura"
              icon={Gauge}
              iconWrapClassName="rounded-lg bg-violet-50 text-violet-700"
              esconderZeroNaExibicao={false}
            />
          </div>
        </details>

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
      </div>

      {!fipeDisponivelNaConsulta ? (
        <BlocoDecisaoMercadoPendente />
      ) : (
        <BlocoDecisaoPrincipal
          temNegociacao={temNegociacao}
          ofertaMaxima={resultado.ofertaMaximaSugerida}
          ofertaInicial={resultado.ofertaInicialAncoragem}
          veredito={veredito}
          vendaUltrapassaFipe={vendaUltrapassaFipe}
          meta={meta}
          aguardandoInclusaoFipeMercado={
            !fipeCarregada && fipeDisponivelNaConsulta
          }
        />
      )}

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
        <CampoMonetarioMascarado
          id="preco-pedido"
          label="Preço pedido pelo vendedor"
          legenda="O que o vendedor está pedindo — não entra no custo total nem no teto; serve só para comparar com o limite seguro acima."
          valueCentavos={precoPedidoCentavos}
          onChangeCentavos={setPrecoPedidoCentavos}
          icon={Banknote}
        />
      </div>

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
        consultandoRiscoTipo={consultandoRiscoTipo}
        sandboxPremiumAviso={sandboxPremiumAviso}
        onAbrirModal={(tipo, precoLabel) => {
          setErroConsultaRisco(null);
          setModalConsultaRiscoPix({ tipo, precoLabel });
        }}
      />

      <AlertasDecisao
        alertaPrejuizoCombinado={alertaPrejuizoCombinado}
        pedidoAcimaDoTetoSeguro={pedidoAcimaDoTetoSeguro}
        prejuizoPessimista={prejuizoPessimista}
        diferencaParaTeto={diferencaParaTeto}
        lucroElevado={lucroElevado}
        vendaAbaixoDaFipe={vendaAbaixoDaFipe}
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
        formulaVendaRealista={
          fipeValidaParaAjuste && contextoFipeMercadoAtivo
            ? {
                fipeRef: fipeReferenciaReais,
                multiplicador: 1 + ajusteTotalMercadoUi,
                ajustePct: ajusteFipePctClamped,
                impactoRiscoDecimal: impactoTotal,
                impactoRiscoBruto: impactoTotalBruto,
                resultado: baseVenda,
              }
            : null
        }
      />

      <ModalConsultaRiscoPremium
        placa={placa}
        identificadorCliente={identificadorCliente}
        modal={modalConsultaRiscoPix}
        consultandoRiscoTipo={consultandoRiscoTipo}
        erroConsultaRisco={erroConsultaRisco}
        onFechar={() => setModalConsultaRiscoPix(null)}
        onErro={setErroConsultaRisco}
        onInicioConsulta={setConsultandoRiscoTipo}
        onFimConsulta={() => setConsultandoRiscoTipo(null)}
        onDadosLeilaoAtualizado={onDadosLeilaoAtualizado}
      />
      </div>
    </div>
  );
}
