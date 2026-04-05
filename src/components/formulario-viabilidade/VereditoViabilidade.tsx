"use client";

import type { VereditoViabilidade } from "@/lib/viabilidade";
import { formatarPercentual } from "@/lib/viabilidade";

const ESTILO: Record<
  VereditoViabilidade,
  { emoji: string; barra: string; chip: string }
> = {
  arriscado: {
    emoji: "🔴",
    barra: "bg-red-500",
    chip:
      "border-red-300 bg-red-50 text-red-950 ring-1 ring-red-200/80",
  },
  atencao: {
    emoji: "🟡",
    barra: "bg-amber-400",
    chip:
      "border-amber-300 bg-amber-50 text-amber-950 ring-1 ring-amber-200/80",
  },
  viavel: {
    emoji: "🟢",
    barra: "bg-emerald-500",
    chip:
      "border-emerald-300 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200/80",
  },
  indefinido: {
    emoji: "⚪",
    barra: "bg-slate-300",
    chip:
      "border-slate-300 bg-slate-50 text-slate-800 ring-1 ring-slate-200/80",
  },
};

const MENSAGEM: Record<VereditoViabilidade, string> = {
  arriscado: "Não recomendado. Margem de segurança insuficiente.",
  atencao:
    "Viável com ressalvas. Negocie o valor de compra para melhorar a margem.",
  viavel: "Excelente negócio. Margem de lucro segura.",
  indefinido:
    "Preencha preço de compra, reparos, transporte, documentação, multas e outros custos para ver a margem.",
};

export type VereditoViabilidadePainelProps = {
  veredito: VereditoViabilidade;
  margemRealProjecaoPct: number | null;
  exibir: boolean;
};

/**
 * Semáforo de viabilidade (margem % sobre compra + reparos + documentação).
 */
export function VereditoViabilidadePainel({
  veredito,
  margemRealProjecaoPct,
  exibir,
}: VereditoViabilidadePainelProps) {
  if (!exibir) return null;

  const s = ESTILO[veredito];
  const msg = MENSAGEM[veredito];

  return (
    <div
      className={`rounded-2xl border px-4 py-4 shadow-sm ${s.chip}`}
      data-testid="veredito-viabilidade-semaforo"
      role="status"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {s.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">
            Veredito
          </p>
          {margemRealProjecaoPct !== null ? (
            <p className="mt-1 text-lg font-black tabular-nums tracking-tight">
              Margem real:{" "}
              {formatarPercentual(margemRealProjecaoPct, 1)}
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Margem real: —
            </p>
          )}
          <p className="mt-2 text-sm font-medium leading-snug">{msg}</p>
        </div>
      </div>
      <div
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/10"
        aria-hidden
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${s.barra}`}
          style={{
            width:
              veredito === "indefinido" || margemRealProjecaoPct === null
                ? "12%"
                : veredito === "arriscado"
                  ? "33%"
                  : veredito === "atencao"
                    ? "66%"
                    : "100%",
          }}
        />
      </div>
    </div>
  );
}
