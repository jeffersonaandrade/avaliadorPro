"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatarMoedaBRL, type VereditoViabilidade } from "@/lib/viabilidade";
import { ValorEmLinha } from "./campos-ui";

export function BlocoDecisaoMercadoPendente() {
  return (
    <div
      className="min-w-0 max-w-full overflow-hidden rounded-2xl border-2 border-dashed border-indigo-300/80 bg-slate-50/90 p-6 text-center shadow-inner ring-1 ring-indigo-100/60 sm:p-8"
      data-testid="bloco-decisao-mercado-pendente"
    >
      <p className="text-sm font-semibold text-slate-800">
        Referência de mercado indisponível nesta análise
      </p>
      <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-slate-600">
        Oferta máxima, oferta inicial e veredito dependem de uma referência de mercado válida. Verifique o aviso da
        análise acima ou tente outra placa.
      </p>
    </div>
  );
}

/** Destaque do teto de compra (oferta máxima) + veredito do motor. */
export function BlocoDecisaoPrincipal({
  temNegociacao,
  ofertaMaxima,
  ofertaInicial,
  veredito,
  meta,
  aguardandoInclusaoFipeMercado,
}: {
  temNegociacao: boolean;
  ofertaMaxima: number | null;
  ofertaInicial: number | null;
  veredito: VereditoViabilidade;
  vendaUltrapassaFipe?: boolean;
  meta: { titulo: string; subtitulo: string };
  aguardandoInclusaoFipeMercado?: boolean;
}) {
  const vereditoCores =
    veredito === "viavel"
      ? "border-emerald-400/40 bg-emerald-950/40 text-emerald-100"
      : veredito === "arriscado"
        ? "border-red-400/40 bg-red-950/35 text-red-100"
        : veredito === "atencao"
          ? "border-amber-400/35 bg-amber-950/30 text-amber-50"
          : "border-slate-500/40 bg-slate-800/80 text-slate-200";

  return (
    <div
      className="min-w-0 max-w-full overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-900 p-6 text-center shadow-xl ring-1 ring-slate-800 sm:p-8"
      data-testid="bloco-decisao-principal"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        Teto de compra
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
      {temNegociacao && ofertaMaxima !== null ? (
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-400">
          Máximo que você pode pagar mantendo a <strong className="text-slate-300">venda realista</strong> de
          mercado, os custos (incl. multas/documentação manuais) e sua meta de lucro — não é o que o vendedor
          pede.
        </p>
      ) : null}
      {!temNegociacao ? (
        <p className="mx-auto mt-3 max-w-md text-xs text-slate-400">
          {aguardandoInclusaoFipeMercado
            ? "Inclua a referência FIPE na análise (botão na simulação base acima) para ver o teto de compra e o veredito."
            : "Revise lucro, custos e ajuste sobre FIPE — o teto não pôde ser calculado com os dados atuais."}
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
            <AlertTriangle className="mx-auto size-8 shrink-0 text-red-300 sm:mx-0" />
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
