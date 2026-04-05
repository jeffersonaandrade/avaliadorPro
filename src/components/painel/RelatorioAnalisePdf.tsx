"use client";

import type { ChaveFatorRisco } from "@/components/formulario-viabilidade/historico-veiculo";
import type { DebitosRenainfPdf, LaudoTecnicoRiscosPdf } from "@/lib/api-v2/parsers";
import type { VereditoViabilidade } from "@/lib/viabilidade";
import { formatarMoedaBRL } from "@/lib/viabilidade";

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
          Relatório de viabilidade
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
    const extra = opts.margemFinanceiraAguardandoCustos
      ? " Margem financeira: aguarde reparos e documentação para calcular lucro."
      : ` ${subtituloMotor}`;
    return {
      titulo: "🔴 ARRISCADO — RISCO ESTRUTURAL",
      classe:
        "border-red-600 bg-red-50 text-red-950 ring-2 ring-red-200",
      subtitulo:
        "Leilão ou sinistro (perda total) identificado na blindagem." + extra,
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

  const sugestaoNegociacao =
    ofertaMaxima !== null &&
    Number.isFinite(ofertaMaxima) &&
    ofertaMaxima > 0
      ? `Sugestão de negociação: ancore a proposta abaixo de ${formatarMoedaBRL(
          ofertaMaxima
        )} e use esse teto como referência firme na mesa — evite estender a oferta além desse limite sem revisar custos e riscos.`
      : null;

  return (
    <div
      id="area-relatorio"
      className="relative mx-auto w-full max-w-[210mm] overflow-visible rounded-2xl border border-slate-300 bg-white p-6 text-slate-900 shadow-sm print:shadow-none"
      data-testid="area-relatorio"
    >
      {meta.relatorioDemonstracao ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
          aria-hidden
        >
          <p className="max-w-[90%] rotate-[-18deg] text-center text-lg font-black uppercase leading-tight text-red-600/[0.14] sm:text-xl print:text-red-700/15">
            RELATÓRIO DE DEMONSTRAÇÃO — DADOS SIMULADOS
          </p>
        </div>
      ) : null}
      <div
        data-pdf-chunk
        className="relative z-20 overflow-visible rounded-xl bg-white"
      >
        {meta.relatorioDemonstracao ? (
          <div
            className="relative z-20 mb-4 rounded-lg border-2 border-dashed border-red-400 bg-red-50/90 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-red-900"
            role="status"
          >
            RELATÓRIO DE DEMONSTRAÇÃO — DADOS SIMULADOS
          </div>
        ) : null}

        <header className="relative z-20 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
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
      </div>

      <div className="relative z-20 mt-6 flex flex-col gap-6">
        <section
          data-pdf-chunk
          className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2 className="sr-only">Veredito</h2>
          <div
            className={`w-full rounded-2xl border-2 px-5 py-4 text-center ${selo.classe}`}
            data-testid="selo-veredito-pdf"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-600">
              Veredito
            </p>
            <p className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
              {selo.titulo}
            </p>
            <p className="mt-2 text-xs font-medium leading-snug opacity-90">
              {selo.subtitulo}
            </p>
          </div>
        </section>

        {fipeOk && contextoFipeMercadoAtivo ? (
          <>
            <section
              data-pdf-chunk
              className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-white p-4"
            >
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Lucro e margem
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                <li>
                  <span className="text-slate-500">Lucro estimado:</span>{" "}
                  <strong className="text-lg tabular-nums text-slate-900">
                    {exibirLucro ? formatarMoedaBRL(lucroEstimadoReais!) : "—"}
                  </strong>
                </li>
                <li>
                  <span className="text-slate-500">Margem (%):</span>{" "}
                  <strong className="tabular-nums text-slate-900">
                    {exibirMargem
                      ? `${margemRealProjecaoPct!.toFixed(1).replace(".", ",")}%`
                      : "—"}
                  </strong>
                </li>
              </ul>
            </section>

            <section
              data-pdf-chunk
              className="relative z-20 overflow-visible rounded-xl border border-slate-900 bg-slate-900 p-4 text-white"
            >
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Não pague mais que
              </h2>
              <p className="mt-2 text-2xl font-black tabular-nums sm:text-3xl">
                {ofertaMaxima !== null && Number.isFinite(ofertaMaxima)
                  ? formatarMoedaBRL(ofertaMaxima)
                  : "—"}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Limite alinhado à venda realista de{" "}
                <span className="font-semibold text-slate-200">
                  {formatarMoedaBRL(baseVenda)}
                </span>{" "}
                (menor entre sua venda esperada e a referência ajustada por risco).
              </p>
            </section>

            {exibirPerdaRisco ? (
              <section
                data-pdf-chunk
                className="relative z-20 overflow-visible rounded-xl border border-amber-200 bg-amber-50/90 p-4"
              >
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-amber-900">
                  Impacto de risco (referência de mercado)
                </h2>
                <p className="mt-2 text-sm font-semibold text-amber-950">
                  Você evitou uma perda de{" "}
                  <span className="font-mono tabular-nums">
                    {formatarMoedaBRL(perdaHistoricoReais)}
                  </span>{" "}
                  neste negócio (referência em relação à FIPE tabela após os indícios
                  validados).
                </p>
                <p className="mt-2 text-xs leading-relaxed text-amber-900/95">
                  Impacto em reais na referência de mercado — use para defender sua
                  margem na negociação.
                </p>
              </section>
            ) : null}

            {sugestaoNegociacao ? (
              <section
                data-pdf-chunk
                className="relative z-20 overflow-visible rounded-xl border border-cyan-200/80 bg-cyan-50/50 p-4 text-sm leading-relaxed text-cyan-950"
              >
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-cyan-800">
                  Sugestão de negociação
                </h2>
                <p className="mt-2">{sugestaoNegociacao}</p>
              </section>
            ) : null}
          </>
        ) : (
          <section
            data-pdf-chunk
            className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"
          >
            Inclua a referência de mercado na decisão na ferramenta para gerar lucro,
            limite sugerido e impacto de risco neste relatório.
          </section>
        )}

        {textoResumoBlindagem ? (
          <section
            data-pdf-chunk
            className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-800"
          >
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Histórico validado (resumo)
            </h2>
            <p className="mt-2 leading-relaxed">{textoResumoBlindagem}</p>
          </section>
        ) : null}

        {exibirLaudo ? (
          <section
            data-pdf-chunk
            className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
              Dossiê de evidências validadas
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Textos extraídos das consultas oficiais registradas para esta placa. Campos
              não retornados pela fonte aparecem como &quot;Não informado&quot; na
              ferramenta; aqui só constam trechos disponíveis.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              {laudo.leilaoParagrafos.length > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-800">
                  <p className="font-bold text-slate-900">Leilão</p>
                  <div className="mt-2 space-y-2 leading-relaxed">
                    {laudo.leilaoParagrafos.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {laudo.sinistroLinhas.length > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-800">
                  <p className="font-bold text-slate-900">Sinistro (perda total)</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 leading-relaxed">
                    {laudo.sinistroLinhas.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {laudo.rouboLinhas.length > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-800">
                  <p className="font-bold text-slate-900">Roubo e furto</p>
                  <ul className="mt-2 list-inside list-decimal space-y-2 leading-relaxed">
                    {laudo.rouboLinhas.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {laudo.gravameLinhas.length > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-800">
                  <p className="font-bold text-slate-900">Gravame</p>
                  <ul className="mt-2 space-y-1 leading-relaxed">
                    {laudo.gravameLinhas.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {laudo.renainfLinhas.length > 0 ? (
                <div className="rounded-lg border border-orange-100 bg-orange-50/80 p-3 text-xs text-orange-950">
                  <p className="font-bold">Renainf — infrações</p>
                  <ul className="mt-2 space-y-2 leading-relaxed">
                    {laudo.renainfLinhas.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {debitosRenainf && debitosRenainf.itens.length > 0 ? (
          <section
            data-pdf-chunk
            className="relative z-20 overflow-visible rounded-xl border border-orange-200/90 bg-orange-50/40 p-4"
          >
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-orange-900">
              Multas e débitos (valores)
            </h2>
            <p className="mt-1 text-[10px] leading-relaxed text-orange-950/90">
              Resumo em reais para apoio à negociação.
            </p>
            <p className="mt-3 text-sm font-bold text-orange-950">
              Total estimado:{" "}
              <span className="tabular-nums text-base">
                {formatarMoedaBRL(debitosRenainf.totalReais)}
              </span>
            </p>
            <ol className="mt-3 list-inside list-decimal space-y-3 text-xs text-orange-950">
              {debitosRenainf.itens.map((inf, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-orange-100 bg-white/90 px-3 py-2 leading-relaxed"
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
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <footer
          data-pdf-chunk
          className="relative z-20 border-t border-slate-200 pt-4 text-center text-[10px] text-slate-500"
        >
          Avaliador PRO · Documento para apoio à negociação · Não substitui vistoria nem
          documentação legal.
        </footer>
      </div>
    </div>
  );
}
