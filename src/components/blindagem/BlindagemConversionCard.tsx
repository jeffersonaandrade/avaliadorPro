"use client";

import Link from "next/link";

import type { VereditoViabilidade } from "@/lib/viabilidade";
import { PriceInline } from "@/components/ui/PriceDisplay";

export type BlindagemConversionCardProps = {
  contextoAtivo: boolean;
  blindagemAtiva: boolean;
  vereditoUi: VereditoViabilidade;
  temRiscoEstrutural: boolean;
  podeAtivarPorSaldo: boolean;
  consultandoBlindagem: boolean;
  riscoEstimadoReais?: number;
  perdaEvitadaReais?: number;
  onAbrirModalBlindagem: () => void;
};

export function BlindagemConversionCard({
  contextoAtivo,
  blindagemAtiva,
  vereditoUi,
  temRiscoEstrutural,
  podeAtivarPorSaldo,
  consultandoBlindagem,
  riscoEstimadoReais = 0,
  perdaEvitadaReais = 0,
  onAbrirModalBlindagem,
}: BlindagemConversionCardProps) {
  if (!contextoAtivo) return null;
  const estadoTensao = vereditoUi === "arriscado" || vereditoUi === "atencao";
  const mostraPreBlindagem = !blindagemAtiva && estadoTensao;
  const mostraPosBlindagem = blindagemAtiva;

  if (!mostraPreBlindagem && !mostraPosBlindagem) return null;

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm sm:p-5">
      {mostraPreBlindagem ? (
        <>
          <h3 className="text-base font-extrabold leading-snug text-amber-950 sm:text-lg">
            {riscoEstimadoReais > 0 ? (
              <>
                🚨 Você pode perder até{" "}
                <PriceInline
                  valor={riscoEstimadoReais}
                  className="font-black text-amber-950"
                />{" "}
                nesse carro
              </>
            ) : vereditoUi === "arriscado" ? (
              "⚠️ Esse carro pode esconder problemas que não aparecem na análise básica."
            ) : (
              "⚠️ Existe risco oculto que pode impactar sua margem."
            )}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-amber-950">
            Sem validar o histórico, você pode perder dinheiro mesmo pagando abaixo
            da FIPE.
          </p>

          {riscoEstimadoReais > 0 ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-sm font-bold text-amber-950">
              💸 Risco estimado: até{" "}
              <PriceInline valor={riscoEstimadoReais} className="font-black" /> de
              prejuízo oculto
            </p>
          ) : null}

          <div className="mt-4">
            {podeAtivarPorSaldo ? (
              <button
                type="button"
                onClick={onAbrirModalBlindagem}
                disabled={consultandoBlindagem}
                className="inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="btn-blindagem-conversao"
              >
                {consultandoBlindagem
                  ? "Validando histórico..."
                  : "🛡️ Validar histórico agora"}
              </button>
            ) : (
              <Link
                href="/creditos"
                className="inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                data-testid="link-comprar-creditos-blindagem"
              >
                Comprar créditos
              </Link>
            )}
            <ul className="mt-3 space-y-1 text-sm leading-relaxed text-amber-950">
              <li>• Consulta completa de leilão, sinistro, roubo e gravame</li>
              <li>• Resultado em segundos</li>
              <li>• Evite comprar no escuro</li>
            </ul>
          </div>
        </>
      ) : null}

      {mostraPosBlindagem ? (
        <div className="rounded-xl border border-white/70 bg-white/75 p-3">
          {temRiscoEstrutural ? (
            <p className="text-sm font-bold leading-relaxed text-amber-950">
              🛡️ Blindagem concluída: você evitou até{" "}
              <PriceInline
                valor={Math.max(0, perdaEvitadaReais)}
                className="font-black"
              />{" "}
              de prejuízo.
            </p>
          ) : (
            <p className="text-sm font-bold leading-relaxed text-emerald-900">
              ✅ Histórico limpo — nenhuma restrição relevante encontrada.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

