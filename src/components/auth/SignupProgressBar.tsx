import type { ReactNode } from "react";
import { Check } from "lucide-react";

type Step = 1 | 2 | 3;

type Props = {
  /** Passo atual (cadastro = 2 — Conta). */
  step: Step;
  /** `true` se `?plano=` válido — passo Plano concluído (check). */
  planoSelecionado: boolean;
};

const labels: Record<Step, string> = {
  1: "Plano",
  2: "Conta",
  3: "Ativação",
};

/** Largura do preenchimento da trilha (0–100%) — Navy/Cyan. */
function fillWidthPercent(step: Step, planoSelecionado: boolean): number {
  if (step >= 3) return 100;
  if (step === 2) {
    if (planoSelecionado) return 52;
    return 28;
  }
  if (step === 1 && planoSelecionado) return 18;
  return 8;
}

export function SignupProgressBar({ step, planoSelecionado }: Props) {
  const items: Step[] = [1, 2, 3];
  const fill = fillWidthPercent(step, planoSelecionado);

  return (
    <nav className="w-full max-w-md" aria-label="Progresso do cadastro">
      <div className="relative px-0.5 pt-1">
        {/* Trilha Navy */}
        <div
          className="absolute left-[8%] right-[8%] top-[15px] h-1.5 overflow-hidden rounded-full bg-[#0f172a] ring-1 ring-slate-800/90 sm:top-[17px]"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-700 via-cyan-500 to-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.35)] transition-[width] duration-500 ease-out"
            style={{ width: `${fill}%` }}
          />
        </div>

        <div className="relative flex items-start justify-between">
          {items.map((num) => {
            const passoPlanoOk = num === 1 && planoSelecionado;
            const passoAtivo = num === step;
            let circleClass: string;
            let content: ReactNode;

            if (passoPlanoOk) {
              circleClass =
                "border-cyan-400/90 bg-[#0a1628] text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.25)]";
              content = (
                <Check className="size-3.5 sm:size-4" strokeWidth={2.5} aria-hidden />
              );
            } else if (passoAtivo) {
              circleClass =
                "border-cyan-400 bg-cyan-500/15 text-white shadow-[0_0_20px_rgba(34,211,238,0.45)] ring-2 ring-cyan-400/30";
              content = <span>{num}</span>;
            } else {
              circleClass =
                "border-slate-600 bg-[#0b1220] text-slate-500 ring-1 ring-slate-800/80";
              content = <span>{num}</span>;
            }

            const labelClass = passoAtivo
              ? "text-cyan-300"
              : passoPlanoOk
                ? "text-cyan-200/90"
                : "text-slate-500";

            return (
              <div
                key={num}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <div
                  className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition sm:size-9 sm:text-sm ${circleClass}`}
                >
                  {content}
                </div>
                <span
                  className={`text-center text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${labelClass}`}
                >
                  {labels[num]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-500 sm:text-xs">
        Etapa Ativação: pagamento e liberação do plano (em breve).
      </p>
    </nav>
  );
}
