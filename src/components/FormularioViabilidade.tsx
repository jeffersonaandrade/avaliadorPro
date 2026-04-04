"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileText,
  Gauge,
  Handshake,
  Percent,
  Truck,
  Wallet,
  Wrench,
} from "lucide-react";
import { salvarSimulacaoViabilidadeAction } from "@/actions/viabilidade-actions";
import {
  AJUSTE_FIPE_PCT_MAX,
  AJUSTE_FIPE_PCT_MIN,
  calcularViabilidade,
  centavosDeInputMoedaBr,
  formatarMoedaBRL,
  formatarCentavosMoedaCampo,
  formatarPercentual,
  GORDURA_NEGOCIACAO_PADRAO,
  MAX_CENTAVOS_MOEDA,
  parseValorBRL,
  type EntradasViabilidade,
  simulacaoFromJSON,
  type VereditoViabilidade,
} from "@/lib/viabilidade";

const DEBOUNCE_MS = 700;
const PCT_PADRAO = 15;
/** Acima disso, exibimos aviso educativo (não bloqueia o valor). */
const LUCRO_ELEVADO_LIMITE_PCT = 20;

/** Mock até integração com gateway PIX. */
const PIX_CHAVE_MOCK = "000.000.000-00";
const PIX_VALOR_TEXTO = "R$ 9,90";

/** Tom “muted” alinhado a text-muted-foreground (Tailwind: slate-500). */
const legendaCls = "text-xs leading-snug text-slate-500";

function LegendaAjuda({ children }: { children: ReactNode }) {
  return (
    <p className={`mt-2 flex gap-2 ${legendaCls}`}>
      <CircleHelp
        className="mt-0.5 size-3.5 shrink-0 text-slate-400"
        strokeWidth={2}
        aria-hidden
      />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function formatarPctParaCampo(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (n % 1 === 0) return String(n);
  return n.toFixed(1).replace(".", ",");
}

/** Valores monetários: uma linha, sem quebrar; fonte responsiva vem do className. */
function ValorEmLinha({
  children,
  className = "",
  justifyCenter = false,
}: {
  children: ReactNode;
  className?: string;
  /** Hero centralizado: inline-block + text-center no pai para não “esticar” a linha. */
  justifyCenter?: boolean;
}) {
  const tituloCompleto =
    typeof children === "string" || typeof children === "number"
      ? String(children)
      : undefined;

  const corpo =
    "min-w-0 max-w-full font-mono font-bold tabular-nums tracking-tight whitespace-nowrap overflow-hidden text-ellipsis";

  if (justifyCenter) {
    return (
      <div
        className="min-w-0 w-full max-w-full overflow-hidden text-center"
        title={tituloCompleto}
      >
        <p className={`inline-block ${corpo} ${className}`}>{children}</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 w-full max-w-full justify-start overflow-hidden"
      title={tituloCompleto}
    >
      <p className={`block w-full min-w-0 ${corpo} ${className}`}>{children}</p>
    </div>
  );
}

/**
 * Estado no pai: centavos inteiros. Só formatamos para o value do input (Intl),
 * parse com centavosDeInputMoedaBr — evita duplicação tipo 999.999.999,00.
 */
function CampoMonetarioMascarado({
  id,
  label,
  legenda,
  valueCentavos,
  onChangeCentavos,
  icon: Icon,
}: {
  id: string;
  label: string;
  legenda?: string;
  valueCentavos: number;
  onChangeCentavos: (centavos: number) => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  const [focado, setFocado] = useState(false);
  const c = Math.min(
    MAX_CENTAVOS_MOEDA,
    Math.max(0, Math.floor(Number.isFinite(valueCentavos) ? valueCentavos : 0))
  );
  const textoExibido =
    c === 0 && !focado ? "" : formatarCentavosMoedaCampo(c);

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-100 transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
      <label
        htmlFor={id}
        className="flex min-w-0 flex-col gap-2 text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500 sm:text-[11px] sm:tracking-wider"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <span className="min-w-0 break-words">{label}</span>
      </label>
      <div className="relative mt-3 min-w-0 max-w-full overflow-hidden">
        <span className="pointer-events-none absolute left-0 top-1/2 z-[1] -translate-y-1/2 text-sm font-semibold text-slate-400">
          R$
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={textoExibido}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          onChange={(e) => {
            onChangeCentavos(centavosDeInputMoedaBr(e.target.value));
          }}
          className="box-border min-w-0 max-w-full border-0 bg-transparent py-1 pl-9 font-mono text-lg font-semibold tabular-nums text-slate-900 outline-none placeholder:text-slate-300"
          data-testid={`viabilidade-${id}`}
        />
      </div>
      {legenda ? <LegendaAjuda>{legenda}</LegendaAjuda> : null}
    </div>
  );
}

function CampoPercentualEditavel({
  id,
  label,
  legenda,
  hint,
  valueNum,
  onCommit,
  min = 0,
  max,
  placeholder,
  testId,
  icon: Icon,
  iconWrapClassName = "rounded-lg bg-emerald-50 text-emerald-700",
  esconderZeroNaExibicao = true,
}: {
  id: string;
  label: string;
  legenda?: string;
  hint?: ReactNode;
  valueNum: number;
  onCommit: (n: number) => void;
  min?: number;
  max: number;
  placeholder?: string;
  testId: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconWrapClassName?: string;
  /** Se true, com valor 0 o campo fica vazio (útil para lucro: apagar e redigitar). */
  esconderZeroNaExibicao?: boolean;
}) {
  const [rascunho, setRascunho] = useState<string | null>(null);
  const exibido =
    rascunho !== null
      ? rascunho
      : esconderZeroNaExibicao && valueNum === 0
        ? ""
        : formatarPctParaCampo(valueNum);

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <label
        htmlFor={id}
        className="flex min-w-0 flex-col gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500"
      >
        <span
          className={`flex size-8 shrink-0 items-center justify-center ${iconWrapClassName}`}
        >
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <span className="min-w-0 break-words leading-tight">{label}</span>
      </label>
      <div className="mt-3 flex min-w-0 max-w-full flex-col gap-2 overflow-hidden">
        <div className="flex max-w-full flex-wrap items-baseline gap-2 overflow-hidden">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={placeholder ?? "0"}
            value={exibido}
            onFocus={() =>
              setRascunho(
                esconderZeroNaExibicao && valueNum === 0
                  ? ""
                  : formatarPctParaCampo(valueNum)
              )
            }
            onBlur={() => {
              const bruto = rascunho?.replace(",", ".").trim() ?? "";
              setRascunho(null);
              if (bruto === "" || bruto === ".") {
                onCommit(0);
                return;
              }
              const n = Number(bruto);
              if (Number.isFinite(n)) {
                onCommit(Math.min(max, Math.max(min, n)));
              }
            }}
            onChange={(e) => setRascunho(e.target.value)}
            className="min-w-0 max-w-full flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 font-mono text-xl font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:max-w-[10rem]"
            data-testid={testId}
          />
          <span className="shrink-0 text-lg font-semibold text-slate-600">%</span>
        </div>
        {legenda ? <LegendaAjuda>{legenda}</LegendaAjuda> : null}
        {hint ? (
          <div className={legendaCls}>{hint}</div>
        ) : null}
      </div>
    </div>
  );
}

/** Resultado principal: decisão de compra + veredito (sem alterar cálculos). */
function BlocoDecisaoPrincipal({
  temNegociacao,
  ofertaMaxima,
  ofertaInicial,
  veredito,
  vendaUltrapassaFipe,
  meta,
}: {
  temNegociacao: boolean;
  ofertaMaxima: number | null;
  ofertaInicial: number | null;
  veredito: VereditoViabilidade;
  vendaUltrapassaFipe: boolean;
  meta: { titulo: string; subtitulo: string };
}) {
  const vereditoCores =
    veredito === "viavel"
      ? "border-emerald-400/40 bg-emerald-950/40 text-emerald-100"
      : veredito === "arriscado"
        ? vendaUltrapassaFipe
          ? "border-red-400/40 bg-red-950/35 text-red-100"
          : "border-amber-400/40 bg-amber-950/35 text-amber-100"
        : veredito === "atencao"
          ? "border-amber-400/35 bg-amber-950/30 text-amber-50"
          : "border-slate-500/40 bg-slate-800/80 text-slate-200";

  return (
    <div
      className="min-w-0 max-w-full overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-900 p-6 text-center shadow-xl ring-1 ring-slate-800 sm:p-8"
      data-testid="bloco-decisao-principal"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        Pague no máximo
      </p>
      <div className="mx-auto mt-3 flex min-w-0 w-full max-w-full justify-center">
        <ValorEmLinha
          justifyCenter
          className="text-center font-extrabold text-white [font-size:clamp(0.9375rem,5.2vw+0.35rem,2.75rem)] sm:[font-size:clamp(1.0625rem,4.2vw+0.55rem,3rem)] md:[font-size:clamp(1.25rem,3.5vw+0.65rem,3.25rem)]"
        >
          {temNegociacao && ofertaMaxima !== null
            ? formatarMoedaBRL(ofertaMaxima)
            : "—"}
        </ValorEmLinha>
      </div>
      {!temNegociacao ? (
        <p className="mx-auto mt-3 max-w-md text-xs text-slate-400">
          Informe a FIPE na consulta da placa para calcular o teto de compra.
        </p>
      ) : null}

      <div className="mx-auto mt-8 min-w-0 max-w-full border-t border-white/10 pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Comece oferecendo
        </p>
        <div className="mx-auto mt-2 flex min-w-0 w-full max-w-full justify-center">
          <ValorEmLinha
            justifyCenter
            className="text-center font-bold text-slate-100 text-base sm:text-lg md:text-xl lg:text-2xl"
          >
            {temNegociacao && ofertaInicial !== null
              ? formatarMoedaBRL(ofertaInicial)
              : "—"}
          </ValorEmLinha>
        </div>
      </div>

      <div
        className={`mx-auto mt-8 max-w-full rounded-xl border px-4 py-4 text-left ${vereditoCores}`}
        data-testid="badge-veredito-viabilidade"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          {veredito === "viavel" ? (
            <CheckCircle2 className="mx-auto size-8 shrink-0 text-emerald-400 sm:mx-0" />
          ) : veredito === "arriscado" ? (
            <AlertTriangle className="mx-auto size-8 shrink-0 text-orange-300 sm:mx-0" />
          ) : veredito === "atencao" ? (
            <AlertTriangle className="mx-auto size-8 shrink-0 text-amber-300 sm:mx-0" />
          ) : (
            <AlertTriangle className="mx-auto size-8 shrink-0 text-slate-400 sm:mx-0" />
          )}
          <div className="min-w-0 flex-1 overflow-hidden text-center sm:text-left">
            <p className="break-words font-bold leading-snug">{meta.titulo}</p>
            <p className="mt-2 break-words text-sm leading-relaxed opacity-90">
              {meta.subtitulo}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const rotulosVeredito: Record<
  VereditoViabilidade,
  { titulo: string; subtitulo: string }
> = {
  viavel: {
    titulo: "Compra viável",
    subtitulo:
      "Preço de venda sugerido está pelo menos 10% abaixo da FIPE, com folga de custo.",
  },
  arriscado: {
    titulo: "Compra arriscada",
    subtitulo:
      "Custos operacionais muito próximos da FIPE ou venda sugerida acima do mercado de referência.",
  },
  atencao: {
    titulo: "Atenção ao preço",
    subtitulo:
      "Revise margem: a venda sugerida não atinge 10% abaixo da FIPE com folga confortável.",
  },
  indefinido: {
    titulo: "Veredito indisponível",
    subtitulo: "Sem valor FIPE válido para comparar o cenário.",
  },
};

export function FormularioViabilidade({
  placa,
  fipeTexto,
  simulacaoJson,
}: {
  placa: string;
  fipeTexto: string;
  simulacaoJson: unknown;
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
  /** Reservado para ocultar o upsell após consulta premium real (API futura). */
  const [consultaPremiumFeita, setConsultaPremiumFeita] = useState(false);
  const [modalPixAberto, setModalPixAberto] = useState(false);

  const entradas: EntradasViabilidade = {
    precoPedido: precoPedidoCentavos / 100,
    reparos: reparosCentavos / 100,
    transporte: transporteCentavos / 100,
    documentacao: documentacaoCentavos / 100,
    outrosCustos: outrosCustosCentavos / 100,
    pctLucroDesejado: pctLucro,
    pctGorduraNegociacao: pctGordura,
    ajusteFipePct,
  };

  const resultado = calcularViabilidade(entradas, fipeTexto);

  const primeiraExecucao = useRef(true);
  useEffect(() => {
    if (primeiraExecucao.current) {
      primeiraExecucao.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      void salvarSimulacaoViabilidadeAction({
        placa,
        fipeTexto,
        precoPedido: precoPedidoCentavos / 100,
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
    fipeTexto,
    precoPedidoCentavos,
    reparosCentavos,
    transporteCentavos,
    documentacaoCentavos,
    outrosCustosCentavos,
    pctLucro,
    pctGordura,
    ajusteFipePct,
  ]);

  useEffect(() => {
    if (!modalPixAberto) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalPixAberto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalPixAberto]);

  const { veredito } = resultado;
  const meta = rotulosVeredito[veredito];
  const fipeNum = parseValorBRL(fipeTexto);
  const vendaUltrapassaFipe =
    Number.isFinite(fipeNum) &&
    fipeNum > 0 &&
    resultado.precoVendaSugerido > fipeNum;

  const vendaAbaixoDaFipe =
    Number.isFinite(fipeNum) &&
    fipeNum > 0 &&
    resultado.precoVendaSugerido < fipeNum;

  const temNegociacao =
    resultado.ofertaMaximaSugerida !== null &&
    resultado.ofertaInicialAncoragem !== null;

  const lucroElevado = pctLucro > LUCRO_ELEVADO_LIMITE_PCT;

  const baseVenda = resultado.precoVendaSugerido;

  const custoPessimista = resultado.custoTotal * 1.1;
  const vendaPessimista = baseVenda * 0.9;
  const lucroPessimista = vendaPessimista - custoPessimista;
  const margemPessimistaPct =
    custoPessimista > 0
      ? (lucroPessimista / custoPessimista) * 100
      : null;

  const prejuizoPessimista = lucroPessimista < 0;
  const lucroBase = resultado.precoVendaSugerido - resultado.custoTotal;

  const precoPedidoReais = precoPedidoCentavos / 100;
  const diferencaParaTeto =
    precoPedidoReais - (resultado.ofertaMaximaSugerida ?? 0);
  const acimaDoTeto = diferencaParaTeto > 0;

  const custosFixosReais =
    reparosCentavos / 100 +
    transporteCentavos / 100 +
    documentacaoCentavos / 100 +
    outrosCustosCentavos / 100;
  const lucroIdealSimulado =
    resultado.ofertaMaximaSugerida !== null
      ? resultado.precoVendaSugerido -
        (resultado.ofertaMaximaSugerida + custosFixosReais)
      : null;

  const exibirLinhasLucroCenario =
    resultado.custoTotal > 0 &&
    Number.isFinite(lucroBase) &&
    Number.isFinite(lucroPessimista);

  const exibirComparacaoPedido =
    temNegociacao && precoPedidoCentavos > 0;

  const exibirBlocoResumo =
    exibirLinhasLucroCenario || exibirComparacaoPedido;

  const resumoComRiscoVisual =
    exibirLinhasLucroCenario && prejuizoPessimista;

  return (
    <div
      className="mx-auto min-w-0 max-w-full space-y-6 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-6 shadow-xl shadow-slate-200/30 sm:max-w-3xl sm:p-8"
      data-testid="formulario-viabilidade"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <Calculator className="size-6" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              Decisão de compra
            </h3>
            <p className="text-xs text-slate-600">
              Informe os custos · veja quanto pode pagar · salvamento automático
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <CampoMonetarioMascarado
          id="preco-pedido"
          label="Preço pedido pelo vendedor"
          legenda="Valor que o vendedor está pedindo pelo carro (usado apenas para análise de negociação)."
          valueCentavos={precoPedidoCentavos}
          onChangeCentavos={setPrecoPedidoCentavos}
          icon={Banknote}
        />
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
              label="Lucro desejado sobre o custo total"
              legenda="Sua meta de ganho sobre os custos operacionais (reparos, transporte, documentação e outros). O preço de venda sugerido aplica esse percentual sobre essa soma — não inclui o preço pedido pelo vendedor."
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
      </div>

      <BlocoDecisaoPrincipal
        temNegociacao={temNegociacao}
        ofertaMaxima={resultado.ofertaMaximaSugerida}
        ofertaInicial={resultado.ofertaInicialAncoragem}
        veredito={veredito}
        vendaUltrapassaFipe={vendaUltrapassaFipe}
        meta={meta}
      />

      {exibirBlocoResumo ? (
        <div
          className={`rounded-2xl border p-4 shadow-sm ring-1 ${
            resumoComRiscoVisual
              ? "border-red-300 bg-red-50 ring-red-100/80"
              : "border-indigo-200 bg-indigo-50/60 ring-indigo-100/80"
          }`}
          data-testid="resumo-decisao"
        >
          <p
            className={`text-xs font-bold uppercase tracking-wide ${
              resumoComRiscoVisual ? "text-red-800" : "text-indigo-700"
            }`}
          >
            Resumo da decisão
          </p>

          {exibirComparacaoPedido ? (
            <div
              className={`mt-4 rounded-xl border p-3 ${
                resumoComRiscoVisual
                  ? "border-red-200/90 bg-white/60"
                  : "border-indigo-200/80 bg-white/70"
              }`}
              data-testid="resumo-pedido-vs-teto"
            >
              <p
                className={`text-[11px] font-bold uppercase tracking-wide ${
                  resumoComRiscoVisual ? "text-red-800" : "text-indigo-700"
                }`}
              >
                Negociação
              </p>
              <div
                className={`mt-3 grid gap-3 font-mono text-sm font-bold tabular-nums sm:grid-cols-2 ${
                  resumoComRiscoVisual ? "text-red-950" : "text-indigo-950"
                }`}
              >
                <div className="min-w-0">
                  <span className="block text-[10px] font-normal uppercase tracking-wide opacity-80">
                    Pedido do vendedor
                  </span>
                  {formatarMoedaBRL(precoPedidoReais)}
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-normal uppercase tracking-wide opacity-80">
                    Oferta máxima (sistema)
                  </span>
                  {formatarMoedaBRL(resultado.ofertaMaximaSugerida!)}
                </div>
              </div>
              {acimaDoTeto ? (
                <p
                  className={`mt-3 text-sm font-medium leading-snug ${
                    resumoComRiscoVisual ? "text-red-950" : "text-indigo-950"
                  }`}
                >
                  Para caber no teto com a margem desejada, o pedido precisa cair pelo menos{" "}
                  <span className="font-mono font-bold tabular-nums">
                    {formatarMoedaBRL(diferencaParaTeto)}
                  </span>
                  .
                </p>
              ) : (
                <p
                  className={`mt-3 text-sm leading-snug ${
                    resumoComRiscoVisual ? "text-red-900/90" : "text-indigo-900/90"
                  }`}
                >
                  O pedido está no teto ou abaixo do máximo sugerido pelo sistema.
                </p>
              )}
              {lucroIdealSimulado !== null && Number.isFinite(lucroIdealSimulado) ? (
                <p
                  className={`mt-3 border-t pt-3 text-xs leading-relaxed ${
                    resumoComRiscoVisual ? "border-red-200/80 text-red-900/85" : "border-indigo-200/80 text-indigo-900/80"
                  }`}
                >
                  <span className="font-semibold">Hipótese (compra no teto):</span> se você comprasse na oferta
                  máxima e vendesse ao preço sugerido, o lucro seria aproximadamente{" "}
                  <span className="font-mono font-bold tabular-nums">
                    {formatarMoedaBRL(lucroIdealSimulado)}
                  </span>{" "}
                  (simulação — não substitui seus custos reais de aquisição).
                </p>
              ) : null}
            </div>
          ) : null}

          {exibirLinhasLucroCenario ? (
            <>
              <p
                className={`mt-4 text-sm leading-snug ${
                  resumoComRiscoVisual ? "text-red-950" : "text-indigo-900"
                }`}
              >
                {prejuizoPessimista
                  ? "Há risco de prejuízo no cenário conservador."
                  : "A operação mantém lucro mesmo em cenário conservador."}
              </p>
              <p
                className={`mt-3 flex min-w-0 flex-col gap-2 font-mono text-sm font-bold tabular-nums tracking-tight sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3 ${
                  resumoComRiscoVisual ? "text-red-950" : "text-indigo-950"
                }`}
              >
                <span className="min-w-0 whitespace-nowrap">
                  Lucro esperado: {formatarMoedaBRL(lucroBase)}
                </span>
                <span
                  className={`hidden sm:inline ${resumoComRiscoVisual ? "text-red-300" : "text-indigo-300"}`}
                  aria-hidden
                >
                  |
                </span>
                <span className="min-w-0 whitespace-nowrap">
                  Pior cenário: {formatarMoedaBRL(lucroPessimista)}
                </span>
              </p>
              <p
                className={`mt-3 text-sm leading-snug ${
                  resumoComRiscoVisual ? "text-red-950/90" : "text-indigo-900/85"
                }`}
              >
                <span className="font-semibold">Base de venda:</span> preço de venda sugerido; no conservador
                aplicamos −10% na venda e +10% nos custos.
              </p>
              {margemPessimistaPct !== null ? (
                <p
                  className={`mt-2 text-sm ${
                    resumoComRiscoVisual ? "text-red-900/90" : "text-indigo-800/90"
                  }`}
                >
                  Margem no pior cenário: {formatarPercentual(margemPessimistaPct)}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {!consultaPremiumFeita ? (
        <div className="flex min-w-0 flex-col gap-2">
          <p
            className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-center text-xs font-medium leading-snug text-amber-950"
            role="note"
            data-testid="aviso-calculo-sem-riscos-ocultos"
          >
            ⚠️ Este cálculo não considera riscos ocultos do veículo
          </p>
          <div
            className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-amber-50 p-5 shadow-sm ring-1 ring-red-100/60 sm:p-6"
            data-testid="card-risco-premium"
          >
            <h4 className="text-base font-bold tracking-tight text-red-950 sm:text-lg">
              ⚠️ Riscos ocultos não verificados
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-red-950/90">
              Este veículo pode ter histórico que impacta diretamente seu lucro:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm leading-relaxed text-red-950/85 marker:text-red-600">
              <li>Sinistro ou perda total</li>
              <li>Roubo ou furto</li>
              <li>Passagem por leilão</li>
              <li>Alienação financeira</li>
              <li>Restrições administrativas</li>
            </ul>
            <button
              type="button"
              className="mt-5 w-full rounded-xl bg-red-600 px-4 py-3.5 text-center text-sm font-bold text-white shadow-md transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:bg-red-800 sm:text-base"
              data-testid="btn-ver-historico-premium"
              onClick={() => setModalPixAberto(true)}
            >
              🔍 Ver histórico completo do veículo
            </button>
            <p className="mt-3 text-center text-xs font-medium text-red-900/80">
              Evite prejuízos antes de fechar negócio
            </p>
            <p className="mt-1 text-center text-sm font-semibold text-red-950">
              Consulta completa por R$ 9,90
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col gap-3">
        {prejuizoPessimista ? (
          <div
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
            data-testid="alerta-prejuizo-pessimista"
          >
            🚨 Você pode perder dinheiro nesta compra.
          </div>
        ) : (
          <>
            {lucroElevado ? (
              <div
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-snug text-amber-900"
                role="note"
                data-testid="aviso-lucro-elevado"
              >
                ⚠️ Margem acima da média de mercado (geralmente entre 10% e 20%).
                <br />
                Verifique se esse lucro é realista para esse veículo.
              </div>
            ) : null}
            {vendaAbaixoDaFipe ? (
              <div
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                role="note"
                data-testid="alerta-venda-abaixo-fipe"
              >
                ⚠️ A oferta máxima usa a referência de mercado (FIPE com seu ajuste, se houver).
                <br />
                Sua venda sugerida atual está abaixo do valor de tabela FIPE.
              </div>
            ) : null}
          </>
        )}
      </div>

      {temNegociacao ? (
        <div
          className="min-w-0 max-w-full overflow-hidden rounded-2xl border-2 border-violet-300/80 bg-gradient-to-br from-violet-50 via-white to-indigo-50/90 p-5 shadow-md ring-1 ring-violet-100 sm:p-6"
          data-testid="card-estrategia-negociacao"
        >
          <div className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
              <Handshake className="size-7" strokeWidth={2} />
            </div>
            <div className="min-w-0 max-w-full overflow-hidden">
              <h4 className="text-base font-bold tracking-tight text-violet-950 sm:text-lg">
                Estratégia de negociação
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-violet-900/80 sm:text-sm">
                O teto de compra usa a FIPE com seu ajuste opcional de mercado; custos operacionais informados, lucro
                desejado (
                {pctLucro % 1 === 0 ? String(pctLucro) : pctLucro.toFixed(1).replace(".", ",")}% sobre esses custos) e
                gordura de negociação ({pctGordura}% entre o teto e a oferta inicial). O bloco principal acima reflete o
                que você definiu nos campos.
              </p>
              <button
                type="button"
                onClick={() =>
                  setFormulasNegociacaoVisiveis((v) => !v)
                }
                title="Mostra como calculamos oferta máxima e inicial a partir da FIPE e dos seus percentuais."
                className="mt-3 inline-flex items-center gap-1.5 text-left text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-700 hover:decoration-slate-400"
                data-testid="btn-ver-formula-negociacao"
              >
                <CircleHelp className="size-3.5 shrink-0" strokeWidth={2} />
                {formulasNegociacaoVisiveis ? "Ocultar fórmula" : "Ver fórmula"}
              </button>
              {formulasNegociacaoVisiveis ? (
                <div
                  className="mt-2 max-w-full overflow-hidden rounded-lg border border-violet-200/90 bg-white/90 p-3 text-slate-500 shadow-sm"
                  role="region"
                  aria-label="Fórmulas da estratégia de negociação"
                >
                  <p className="font-mono text-[11px] leading-relaxed text-slate-600 sm:text-xs">
                    FIPE para negociação = FIPE tabela × (1 + Ajuste%)
                  </p>
                  <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-600 sm:text-xs">
                    Pague no máximo = (FIPE para negociação ÷ (1 + Lucro%)) − Custos extras
                  </p>
                  <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-600 sm:text-xs">
                    Custos extras = Reparos + Transporte + Documentação + Outros custos
                  </p>
                  <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-600 sm:text-xs">
                    Comece oferecendo = teto − % de gordura (sobre o teto)
                  </p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                    = Pague no máximo × (1 − Gordura%)
                  </p>
                  <p className={`mt-2 border-t border-violet-100 pt-2 ${legendaCls}`}>
                    A gordura é aplicada em cima da oferta máxima, sem alterar sua meta de lucro
                    sobre o custo total.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-600">
            Os valores principais estão no bloco escuro acima. Aqui você confere o contexto da FIPE e pode abrir a
            fórmula para validar a conta.
          </p>
        </div>
      ) : (
        <div
          className="min-w-0 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-600"
          data-testid="card-estrategia-negociacao-vazio"
        >
          <p className="font-medium text-slate-700">Estratégia de negociação</p>
          <p className="mt-1 text-xs leading-relaxed">
            Indisponível sem valor FIPE válido para calcular oferta máxima e ancoragem.
          </p>
        </div>
      )}

      <div className="flex min-w-0 max-w-full flex-col gap-4 overflow-hidden">
        <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-md">
          <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-400 sm:tracking-widest">
            Custo total
          </p>
          <ValorEmLinha className="mt-2 text-base text-slate-900 sm:text-lg md:text-xl lg:text-2xl">
            {formatarMoedaBRL(resultado.custoTotal)}
          </ValorEmLinha>
        </div>
        <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-5 shadow-md">
          <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-indigo-600 sm:tracking-widest">
            Preço de venda sugerido
          </p>
          <ValorEmLinha className="mt-2 text-base text-indigo-950 sm:text-lg md:text-xl lg:text-2xl">
            {formatarMoedaBRL(resultado.precoVendaSugerido)}
          </ValorEmLinha>
        </div>
        <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-md">
          <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-400 sm:tracking-widest">
            Margem real vs FIPE
          </p>
          <ValorEmLinha className="mt-2 text-base text-slate-900 sm:text-lg md:text-xl lg:text-2xl">
            {resultado.margemRealSobreFipePct === null
              ? "—"
              : formatarPercentual(resultado.margemRealSobreFipePct)}
          </ValorEmLinha>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            Diferença % da venda sugerida em relação à tabela
          </p>
        </div>
      </div>

      {modalPixAberto && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[1px] sm:items-center"
              role="presentation"
              onClick={() => setModalPixAberto(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-pix-titulo"
                data-testid="modal-pix-pagamento"
                className="max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2
                  id="modal-pix-titulo"
                  className="text-lg font-bold tracking-tight text-slate-900"
                >
                  Desbloquear histórico completo
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  Para consultar o histórico completo deste veículo, realize o pagamento via PIX.
                </p>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Chave PIX
                  </p>
                  <p className="mt-1 font-mono text-base font-bold tabular-nums text-slate-900">
                    {PIX_CHAVE_MOCK}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Valor
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{PIX_VALOR_TEXTO}</p>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  Após o pagamento, clique em &apos;Já paguei&apos; para continuar
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                    data-testid="btn-copiar-chave-pix"
                    onClick={() => {
                      void navigator.clipboard?.writeText(PIX_CHAVE_MOCK);
                    }}
                  >
                    Copiar chave PIX
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    data-testid="btn-ja-paguei"
                    onClick={() => {
                      setConsultaPremiumFeita(true);
                      setModalPixAberto(false);
                      /* Integração futura: validar pagamento e consultar histórico (placa) */
                    }}
                  >
                    Já paguei
                  </button>
                </div>
                <button
                  type="button"
                  className="mt-4 w-full text-center text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
                  data-testid="btn-fechar-modal-pix"
                  onClick={() => setModalPixAberto(false)}
                >
                  Fechar
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
