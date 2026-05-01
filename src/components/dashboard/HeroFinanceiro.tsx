"use client";

import { PriceHero, PriceInline } from "@/components/ui/PriceDisplay";
import { formatarPercentual } from "@/lib/viabilidade";
import { cn } from "@/lib/cn";

export type HeroFinanceiroProps = {
  contextoAtivo: boolean;
  /** Valor em R$ que a análise ajudou a não perder (mesma base que `perdaHistoricoReais` / ROI da blindagem). */
  valorProtegidoReais: number;
  precoMaximoSeguro: number | null;
  lucroEstimadoReais: number | null;
  margemPct: number | null;
  /** Quando falso, lucro e margem mostram "—" (custos incompletos ou aguardando dados). */
  exibirNumerosLucro: boolean;
  blindagemAtiva: boolean;
  className?: string;
};

/**
 * Hero estilo fintech: cartão escuro sobre página clara = contraste alto e foco no valor (ROI).
 * Textos em `text-white` / `text-slate-300` garantem legibilidade em `bg-slate-900`.
 */
export function HeroFinanceiro({
  contextoAtivo,
  valorProtegidoReais,
  precoMaximoSeguro,
  lucroEstimadoReais,
  margemPct,
  exibirNumerosLucro,
  blindagemAtiva,
  className,
}: HeroFinanceiroProps) {
  if (!contextoAtivo) return null;

  const tetoOk =
    precoMaximoSeguro !== null &&
    Number.isFinite(precoMaximoSeguro) &&
    precoMaximoSeguro > 0;

  return (
    <section
      className={cn("min-w-0 space-y-4", className)}
      aria-label="Resumo financeiro da análise"
    >
      <header className="min-w-0 space-y-1 px-0.5 text-center sm:text-left">
        <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
          Você evitou perder dinheiro hoje
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
          Decisões inteligentes baseadas em dados reais
        </p>
      </header>

      <div
        className={cn(
          "overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-lg ring-1 ring-slate-800 sm:p-6"
        )}
      >
        <div className="min-w-0 space-y-2 text-center">
          <PriceHero
            valor={Math.max(0, valorProtegidoReais)}
            spanClassName="text-white"
          />
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300/95 sm:text-sm">
            Valor protegido nesta análise
          </p>
          {!blindagemAtiva ? (
            <p className="mx-auto max-w-md text-center text-xs leading-relaxed text-slate-400">
              Ative a blindagem para ver em R$ o que o histórico pode estar
              escondendo.
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-col items-center gap-2 rounded-xl bg-slate-800/70 px-3 py-4 text-center sm:px-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Preço máximo seguro
            </p>
            <div className="w-full min-w-0">
              {tetoOk ? (
                <div className="flex justify-center">
                  <PriceInline
                    valor={precoMaximoSeguro!}
                    className="text-center text-base text-white sm:text-lg"
                  />
                </div>
              ) : (
                <span className="text-lg font-bold tabular-nums text-slate-500">
                  —
                </span>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col items-center gap-2 rounded-xl bg-slate-800/70 px-3 py-4 text-center sm:px-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Lucro estimado na revenda
            </p>
            <div className="w-full min-w-0">
              {exibirNumerosLucro &&
              lucroEstimadoReais !== null &&
              Number.isFinite(lucroEstimadoReais) ? (
                <div className="flex justify-center">
                  <PriceInline
                    valor={lucroEstimadoReais}
                    className="text-center text-base text-emerald-300 sm:text-lg"
                  />
                </div>
              ) : (
                <span className="text-lg font-bold tabular-nums text-slate-500">
                  —
                </span>
              )}
            </div>
          </div>

          <div className="col-span-2 flex min-w-0 flex-col items-center gap-2 rounded-xl bg-slate-800/70 px-3 py-4 text-center sm:px-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Sua margem na revenda (%)
            </p>
            <p className="text-center text-lg font-black tabular-nums tracking-tight text-white sm:text-xl">
              {exibirNumerosLucro &&
              margemPct !== null &&
              Number.isFinite(margemPct)
                ? formatarPercentual(margemPct, 1)
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
