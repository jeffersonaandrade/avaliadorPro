"use client";

import type { ChaveFatorRisco } from "@/components/formulario-viabilidade/historico-veiculo";
import type { DebitosRenainfPdf, LaudoTecnicoRiscosPdf } from "@/lib/api-v2/parsers";
import { obterMicrocopyDecisao } from "@/lib/microcopy-decisao";
import { StrategyCard } from "@/components/decisao/StrategyCard";
import { RiskAlertCard } from "@/components/risco/RiskAlertCard";
import { PrecoMaximoSeguro } from "@/components/ui/PrecoMaximoSeguro";
import { PriceInline } from "@/components/ui/PriceDisplayPdf";
import { VereditoCard } from "@/components/ui/VereditoCard";
import type { VereditoViabilidade } from "@/lib/viabilidade";
import type { EstadoDecisao } from "@/lib/microcopy-decisao";

export type RelatorioVeiculoMeta = {
  modelo: string;
  ano: number;
  marca?: string;
  consultadoEmIso: string;
  /** `isPlacaVeiculoDemonstracao` ou ambiente sandbox de mocks. */
  relatorioDemonstracao: boolean;
};

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

function LogoRadarTech() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <svg
        viewBox="0 0 48 48"
        className="size-11 shrink-0 text-cyan-700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="currentColor"
          strokeWidth="1.25"
          opacity={0.25}
        />
        <circle
          cx="24"
          cy="24"
          r="13"
          stroke="currentColor"
          strokeWidth="1.25"
          opacity={0.45}
        />
        <circle cx="24" cy="24" r="3.5" fill="currentColor" />
        <path
          d="M24 24 L40 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M24 24 L10 38"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity={0.5}
        />
      </svg>
      <div className="leading-tight">
        <p className="text-lg font-black tracking-tight text-slate-900">
          Avaliador{" "}
          <span className="bg-gradient-to-r from-cyan-700 to-slate-800 bg-clip-text text-transparent">
            PRO
          </span>
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Avaliador PRO — Relatório de Viabilidade
        </p>
      </div>
    </div>
  );
}

const PILARES: { chave: ChaveFatorRisco; label: string }[] = [
  { chave: "leilao", label: "Leilão" },
  { chave: "sinistro", label: "Sinistro" },
  { chave: "roubo", label: "Roubo / furto" },
  { chave: "gravame", label: "Gravame" },
];

function seloVeredito(veredito: VereditoViabilidade): {
  titulo: string;
  classe: string;
} {
  switch (veredito) {
    case "viavel":
      return {
        titulo: "🟢 VIÁVEL",
        classe:
          "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200",
      };
    case "atencao":
      return {
        titulo: "🟡 ATENÇÃO",
        classe:
          "border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-200",
      };
    case "arriscado":
      return {
        titulo: "🔴 ARRISCADO",
        classe: "border-red-600 bg-red-50 text-red-950 ring-2 ring-red-200",
      };
    default:
      return {
        titulo: "VEREDITO INDETERMINADO",
        classe: "border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-200",
      };
  }
}

function resolverSeloRelatorioPdf(
  veredito: VereditoViabilidade,
  subtituloMotor: string,
  opts: {
    blindagemAtiva: boolean;
    contextoFipeMercadoAtivo: boolean;
    riscoEstruturalLeilaoOuSinistro: boolean;
    margemFinanceiraAguardandoCustos: boolean;
  }
): { titulo: string; classe: string; subtitulo: string } {
  if (!opts.contextoFipeMercadoAtivo) {
    const base = seloVeredito(veredito);
    return { ...base, subtitulo: subtituloMotor };
  }
  if (!opts.blindagemAtiva) {
    return {
      titulo: "⚠️ ANÁLISE DE RISCO INCOMPLETA",
      classe:
        "border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-200",
      subtitulo:
        "Valores abaixo usam referência de mercado e custos informados. Valide o histórico premium para concluir riscos ocultos (leilão, sinistro, gravame e demais bases).",
    };
  }
  const base = seloVeredito(veredito);
  if (opts.riscoEstruturalLeilaoOuSinistro) {
    const base =
      "Veículo com histórico crítico (leilão, sinistro ou restrições). Alto risco de prejuízo e baixa liquidez.";
    const extra = opts.margemFinanceiraAguardandoCustos
      ? " Aguarde reparos e documentação para calcular lucro e margem com precisão."
      : "";
    return {
      titulo: "🔴 NÃO RECOMENDADO PARA COMPRA",
      classe:
        "border-red-600 bg-red-50 text-red-950 ring-2 ring-red-200",
      subtitulo: base + extra,
    };
  }
  if (opts.margemFinanceiraAguardandoCustos) {
    return {
      titulo: "⏳ MARGEM FINANCEIRA PENDENTE",
      classe:
        "border-slate-500 bg-slate-100 text-slate-900 ring-2 ring-slate-200",
      subtitulo:
        "Aguardando dados de custo (reparos/documentação) para calcular lucro.",
    };
  }
  return { ...base, subtitulo: subtituloMotor };
}

export type RelatorioAnalisePdfProps = {
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
  laudoTecnicoRiscos?: LaudoTecnicoRiscosPdf;
  debitosRenainf?: DebitosRenainfPdf | null;
  margemRealProjecaoPct?: number | null;
  lucroEstimadoReais?: number | null;
  /** Perda em R$ após blindagem (referência FIPE tabela vs ajustada por risco). */
  perdaHistoricoReais?: number;
};

export function RelatorioAnalisePdf({
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
  laudoTecnicoRiscos,
  debitosRenainf = null,
  margemRealProjecaoPct = null,
  lucroEstimadoReais = null,
  perdaHistoricoReais = 0,
}: RelatorioAnalisePdfProps) {
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

  const selo = resolverSeloRelatorioPdf(veredito, subtituloVeredito, {
    blindagemAtiva,
    contextoFipeMercadoAtivo,
    riscoEstruturalLeilaoOuSinistro,
    margemFinanceiraAguardandoCustos,
  });

  const laudo = laudoTecnicoRiscos ?? {
    leilaoParagrafos: [],
    sinistroLinhas: [],
    rouboLinhas: [],
    gravameLinhas: [],
    renainfLinhas: [],
  };
  const exibirLaudo =
    blindagemAtiva &&
    (laudo.leilaoParagrafos.length > 0 ||
      laudo.sinistroLinhas.length > 0 ||
      laudo.rouboLinhas.length > 0 ||
      laudo.gravameLinhas.length > 0 ||
      laudo.renainfLinhas.length > 0);

  const rotulosAtivos = PILARES.filter((p) => flagsRisco[p.chave]).map(
    (p) => p.label
  );
  const textoResumoBlindagem =
    blindagemAtiva && contextoFipeMercadoAtivo
      ? rotulosAtivos.length > 0
        ? `Indícios nas bases consultadas: ${rotulosAtivos.join(", ")}.`
        : "Nenhum indício estrutural registrado nas consultas para esta placa."
      : null;

  const exibirLucro =
    lucroEstimadoReais !== null && Number.isFinite(lucroEstimadoReais);
  const exibirMargem =
    margemRealProjecaoPct !== null && Number.isFinite(margemRealProjecaoPct);
  const exibirPerdaRisco =
    blindagemAtiva &&
    fipeOk &&
    contextoFipeMercadoAtivo &&
    perdaHistoricoReais > 0;

  const tetoNegociacaoOk =
    ofertaMaxima !== null &&
    Number.isFinite(ofertaMaxima) &&
    ofertaMaxima > 0;
  const sugestaoNegociacao = tetoNegociacaoOk
    ? {
        min: ofertaMaxima * 0.9,
        max: ofertaMaxima * 0.97,
        teto: ofertaMaxima,
      }
    : null;
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

  return (
    <div
      className="relative mx-auto w-full max-w-[800px] min-w-0 overflow-visible break-words text-pretty rounded-2xl border border-slate-300 bg-white p-6 leading-relaxed text-slate-900 shadow-sm print:shadow-none md:p-8"
      data-testid="area-relatorio"
    >
      {meta.relatorioDemonstracao ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-visible"
          aria-hidden
        >
          <p className="max-w-[90%] rotate-[-18deg] text-center text-lg font-black uppercase leading-tight text-red-600/[0.14] sm:text-xl print:text-red-700/15">
            RELATÓRIO DE DEMONSTRAÇÃO — DADOS SIMULADOS
          </p>
        </div>
      ) : null}
      {meta.relatorioDemonstracao ? (
        <div
          className="relative z-20 mb-4 rounded-lg border-2 border-dashed border-red-400 bg-red-50/90 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-red-900"
          role="status"
        >
          RELATÓRIO DE DEMONSTRAÇÃO — DADOS SIMULADOS
        </div>
      ) : null}

      <header className="relative z-20 flex flex-col gap-4 rounded-xl border-b border-slate-200 bg-white pb-5 sm:flex-row sm:items-start sm:justify-between">
        <LogoRadarTech />
        <div className="text-right text-xs text-slate-600">
          <p>
            <span className="font-semibold text-slate-700">Consulta:</span>{" "}
            {consultaFmt}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-slate-700">Emitido em:</span>{" "}
            {emitidoFmt}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">{placa}</p>
        </div>
      </header>

      <section className="relative z-20 mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Veículo
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Placa</p>
            <p className="text-lg font-bold tracking-wide">{placa}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Ano modelo</p>
            <p className="text-lg font-bold">{meta.ano}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-500">Modelo</p>
            <p className="text-base font-semibold leading-snug text-slate-900">
              {meta.marca ? `${meta.marca} · ` : ""}
              {meta.modelo}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-500">Referência de mercado (FIPE tabela)</p>
            <p className="text-xl font-extrabold tabular-nums text-slate-900">
              {fipeTexto === "—" ? "Indisponível" : fipeTexto}
            </p>
          </div>
        </div>
      </section>

      <div className="relative z-20 mt-6 flex min-w-0 flex-col gap-8 break-words text-pretty leading-relaxed">
        <section
          className="relative z-20 min-w-0 overflow-visible rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5"
        >
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
            RESUMO EXECUTIVO
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-800">
            <li>
              <span className="font-semibold text-slate-900">Veredito:</span>{" "}
              {selo.titulo}
            </li>
            <li>
              <span className="font-semibold text-slate-900">
                Preço máximo seguro:
              </span>{" "}
              {ofertaMaxima !== null && Number.isFinite(ofertaMaxima) ? (
                <PriceInline valor={ofertaMaxima} className="font-bold" />
              ) : (
                "—"
              )}
            </li>
            <li>
              <span className="font-semibold text-slate-900">
                Recomendação direta:
              </span>{" "}
              {microcopyDecisao.recomendacao}
            </li>
            <li>
              <span className="font-semibold text-slate-900">Risco principal:</span>{" "}
              {riscoPrincipal}
            </li>
            <li>
              <span className="font-semibold text-slate-900">
                Valor que você evitou perder:
              </span>{" "}
              {exibirPerdaRisco ? (
                <PriceInline valor={perdaHistoricoReais} className="font-bold" />
              ) : (
                "—"
              )}
            </li>
          </ul>
          <p className="mt-3 text-xs font-medium text-slate-600">
            {statusBlindagemResumo}
          </p>
        </section>

        <section
          className="relative z-20 min-w-0 overflow-visible rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <VereditoCard
            variant="pdf"
            titulo={selo.titulo}
            subtitulo={selo.subtitulo}
            molduraClassName={selo.classe}
            data-testid="selo-veredito-pdf"
          />
        </section>

        {fipeOk && contextoFipeMercadoAtivo ? (
          <>
            <section
              className="relative z-20 min-w-0 overflow-visible p-0 sm:p-1"
            >
              <h2 className="mb-3 text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                Preço máximo seguro para comprar
              </h2>
              <PrecoMaximoSeguro
                variant="pdf"
                valor={ofertaMaxima}
                fipe={baseVenda}
              />
            </section>
            <section
              className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
                RECOMENDAÇÃO DIRETA
              </h2>
              <p className="mt-2 whitespace-normal break-words text-pretty text-sm font-semibold leading-relaxed text-slate-900">
                {microcopyDecisao.recomendacao}
              </p>
            </section>

            {blindagemAtiva && riscoEstruturalLeilaoOuSinistro ? (
              <section className="relative z-20 overflow-visible">
                <h2 className="mb-3 text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                  Riscos
                </h2>
                <RiskAlertCard />
              </section>
            ) : null}

            <section
              className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                Quanto você pode lucrar
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-800">
                <li className="leading-relaxed">
                  <span className="text-slate-500">Lucro estimado na revenda:</span>{" "}
                  <strong className="text-lg text-slate-900">
                    {exibirLucro ? (
                      <PriceInline
                        valor={lucroEstimadoReais!}
                        className="text-lg font-bold"
                      />
                    ) : (
                      "—"
                    )}
                  </strong>
                </li>
                <li className="leading-relaxed">
                  <span className="text-slate-500">Sua margem na revenda (%):</span>{" "}
                  <strong className="tabular-nums text-lg text-slate-900">
                    {exibirMargem
                      ? `${margemRealProjecaoPct!.toFixed(1).replace(".", ",")}%`
                      : "—"}
                  </strong>
                </li>
              </ul>
            </section>

            {exibirPerdaRisco ? (
              <section
                className="relative z-20 overflow-visible rounded-xl border border-amber-200 bg-amber-50/90 p-5 sm:p-6"
              >
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-amber-900">
                  Valor que você deixou de perder
                </h2>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-amber-950">
                  Se você pagasse só pelo valor de tabela, poderia jogar fora cerca
                  de{" "}
                  <PriceInline
                    valor={perdaHistoricoReais}
                    className="font-mono font-semibold"
                  />{" "}
                  neste carro.
                </p>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-amber-950">
                  Esta análise mostrou esse risco em reais antes de fechar o
                  negócio.
                </p>
              </section>
            ) : null}

            {sugestaoNegociacao ? (
              <section className="relative z-20 overflow-visible">
                <h2 className="mb-3 text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                  Estratégia na mesa de negociação
                </h2>
                <StrategyCard
                  valorMin={sugestaoNegociacao.min}
                  valorMax={sugestaoNegociacao.max}
                />
                <p className="mt-3 text-center text-xs text-slate-600">
                  Teto de segurança:{" "}
                  <PriceInline
                    valor={sugestaoNegociacao.teto}
                    className="text-sm font-bold"
                  />
                </p>
              </section>
            ) : null}
          </>
        ) : (
          <section
            className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"
          >
            Inclua a referência de mercado na decisão na ferramenta para gerar lucro,
            limite sugerido e impacto de risco neste relatório.
          </section>
        )}

        <section
          className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
            ANÁLISE COMPLETA
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Provas e detalhes técnicos para sustentar negociação (histórico,
            dossiê e débitos).
          </p>
        </section>

        {textoResumoBlindagem ? (
          <section
            className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-800"
          >
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Histórico validado (resumo)
            </h2>
            <p className="mt-2 leading-relaxed">{textoResumoBlindagem}</p>
          </section>
        ) : null}
        {!blindagemAtiva && contextoFipeMercadoAtivo ? (
          <section
            className="relative z-20 overflow-visible rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950"
          >
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-amber-800">
              Histórico não validado
            </h2>
            <p className="mt-2 leading-relaxed">
              Esta análise ainda não validou histórico premium (leilão, sinistro,
              roubo/furto, gravame e Renainf). A decisão final deve considerar esse
              passo para reduzir risco de prejuízo oculto.
            </p>
          </section>
        ) : null}

        {exibirLaudo ? (
          <>
            <section className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
                Dossiê de evidências validadas
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Textos extraídos das consultas oficiais registradas para esta placa. Campos
                não retornados pela fonte aparecem como &quot;Não informado&quot; na
                ferramenta; aqui só constam trechos disponíveis.
              </p>
            </section>

            {laudo.leilaoParagrafos.length > 0 ? (
              <div className="relative z-20 overflow-visible rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-800">
                <p className="font-bold text-slate-900">Leilão</p>
                <div className="mt-2 space-y-2 leading-relaxed">
                  {laudo.leilaoParagrafos.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {laudo.sinistroLinhas.length > 0 ? (
              <div className="relative z-20 overflow-visible rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-800">
                <p className="font-bold text-slate-900">Sinistro (perda total)</p>
                <ul className="mt-2 list-inside list-disc space-y-1 leading-relaxed">
                  {laudo.sinistroLinhas.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {laudo.rouboLinhas.length > 0 ? (
              <div className="relative z-20 overflow-visible rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-800">
                <p className="font-bold text-slate-900">Roubo e furto</p>
                <ul className="mt-2 list-inside list-decimal space-y-2 leading-relaxed">
                  {laudo.rouboLinhas.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {laudo.gravameLinhas.length > 0 ? (
              <div className="relative z-20 overflow-visible rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-800">
                <p className="font-bold text-slate-900">Gravame</p>
                <ul className="mt-2 space-y-1 leading-relaxed">
                  {laudo.gravameLinhas.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {laudo.renainfLinhas.length > 0 ? (
              <div className="relative z-20 overflow-visible rounded-lg border border-orange-100 bg-orange-50/80 p-3 text-xs text-orange-950">
                <p className="font-bold">Renainf — infrações</p>
                <ul className="mt-2 space-y-2 leading-relaxed">
                  {laudo.renainfLinhas.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}

        {debitosRenainf && debitosRenainf.itens.length > 0 ? (
          <div className="flex flex-col gap-4">
            <section className="relative z-20 overflow-visible rounded-xl border border-orange-200/90 bg-orange-50/40 p-4">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-orange-900">
                Multas e débitos (valores)
              </h2>
              <p className="mt-1 text-[10px] leading-relaxed text-orange-950/90">
                Resumo em reais para apoio à negociação.
              </p>
              <p className="mt-3 text-sm font-bold text-orange-950">
                Total estimado:{" "}
                <PriceInline
                  valor={debitosRenainf.totalReais}
                  className="text-base font-bold text-orange-950"
                />
              </p>
            </section>
            {debitosRenainf.itens.map((inf, idx) => (
              <div
                key={idx}
                className="relative z-20 overflow-visible rounded-lg border border-orange-100 bg-white/90 px-3 py-2 text-xs leading-relaxed text-orange-950"
              >
                <span className="font-semibold text-slate-900">
                  {inf.infracao || "Infração"}
                </span>
                <span className="mt-1 block text-orange-950/95">
                  <span className="font-medium">Órgão autuador:</span>{" "}
                  {inf.orgao_autuador || "—"}
                </span>
                <span className="mt-0.5 block">
                  <span className="font-medium">Valor:</span>{" "}
                  <span className="tabular-nums font-semibold">
                    {inf.valor_aplicado || "—"}
                  </span>
                </span>
                <span className="mt-0.5 block text-orange-900/85">
                  <span className="font-medium">Localização:</span>{" "}
                  {inf.local_infracao || "—"}
                </span>
                {inf.numero_auto_infracao ? (
                  <span className="mt-1 block font-mono text-[11px] text-orange-950/95">
                    <span className="font-sans font-medium">Auto:</span>{" "}
                    {inf.numero_auto_infracao}
                  </span>
                ) : null}
                {inf.data_hora_infracao ? (
                  <span className="mt-0.5 block text-orange-900/90">
                    <span className="font-medium">Data da infração:</span>{" "}
                    {inf.data_hora_infracao.trim()}
                  </span>
                ) : null}
                {inf.municipio ? (
                  <span className="mt-0.5 block text-orange-900/90">
                    <span className="font-medium">Município:</span>{" "}
                    {inf.municipio}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <footer
          className="relative z-20 overflow-visible border-t border-slate-200 pt-4 pb-6 text-center text-[10px] leading-relaxed text-slate-500"
        >
          Avaliador PRO · Documento para apoio à negociação · Não substitui vistoria nem
          documentação legal.
        </footer>
      </div>
    </div>
  );
}
