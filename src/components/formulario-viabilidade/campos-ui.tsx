"use client";

import { useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import {
  centavosDeInputMoedaBr,
  formatarCentavosMoedaCampo,
  MAX_CENTAVOS_MOEDA,
} from "@/lib/viabilidade";
import { formatarPctParaCampo, legendaCls } from "./ui-utils";

export function LegendaAjuda({ children }: { children: ReactNode }) {
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

/** Valores monetários: uma linha, sem quebrar; fonte responsiva vem do className. */
export function ValorEmLinha({
  children,
  className = "",
  justifyCenter = false,
}: {
  children: ReactNode;
  className?: string;
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
export function CampoMonetarioMascarado({
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

export function CampoPercentualEditavel({
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
        {hint ? <div className={legendaCls}>{hint}</div> : null}
      </div>
    </div>
  );
}
