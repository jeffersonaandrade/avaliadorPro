import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Car,
  FileWarning,
  Gavel,
  Receipt,
} from "lucide-react";

type Blip = {
  Icon: LucideIcon;
  label: string;
  className: string;
  /** Atraso em segundos, sincronizado com uma volta completa do feixe (4s). */
  sweepDelayS: number;
};

/**
 * Multas (topo), Leilão (direita), Sinistro (base), IPVA (esquerda) —
 * brilho quando o feixe “passa” (mesmo período do spin 4s).
 */
const BLIPS: Blip[] = [
  {
    Icon: FileWarning,
    label: "Multas",
    className: "left-1/2 top-[10%] -translate-x-1/2 sm:top-[12%]",
    sweepDelayS: 0,
  },
  {
    Icon: Gavel,
    label: "Leilão",
    className: "right-[8%] top-1/2 -translate-y-1/2 sm:right-[10%]",
    sweepDelayS: 1,
  },
  {
    Icon: AlertTriangle,
    label: "Sinistro",
    className: "bottom-[14%] left-1/2 -translate-x-1/2 sm:bottom-[16%]",
    sweepDelayS: 2,
  },
  {
    Icon: Receipt,
    label: "IPVA",
    className: "left-[8%] top-1/2 -translate-y-1/2 sm:left-[10%]",
    sweepDelayS: 3,
  },
];

/**
 * Ilustração decorativa: radar / sonar com feixe em conic-gradient.
 */
export function RadarAnimation() {
  return (
    <div
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-950 shadow-2xl shadow-orange-950/30 ring-1 ring-orange-500/10 sm:max-w-lg"
      role="img"
      aria-label="Ilustração: radar de dados veiculares em tempo real"
    >
      <div className="relative aspect-square w-full">
        <div
          className="pointer-events-none absolute inset-[4%] rounded-full border border-slate-700/40"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-[18%] rounded-full border border-slate-700/30"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-[32%] rounded-full border border-slate-700/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-[46%] rounded-full border border-slate-700/20"
          aria-hidden
        />

        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl"
          aria-hidden
        >
          <div
            className="aspect-square w-[118%] max-w-none shrink-0 animate-[spin_4s_linear_infinite] rounded-full opacity-95 sm:w-[115%]"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, transparent 0deg 275deg, rgba(249, 115, 22, 0.06) 288deg, rgba(34, 211, 238, 0.2) 302deg, rgba(56, 189, 248, 0.42) 318deg, rgba(251, 146, 60, 0.18) 332deg, transparent 342deg 360deg)",
            }}
          />
        </div>

        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1)_0%,transparent_50%)]"
          aria-hidden
        />

        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-full border border-orange-400/30 bg-slate-950/95 p-4 shadow-[0_0_36px_rgba(34,211,238,0.18)] ring-1 ring-cyan-400/25 sm:p-5">
            <Car
              className="size-9 text-cyan-400 sm:size-11"
              strokeWidth={1.5}
              aria-hidden
            />
          </div>
        </div>

        {BLIPS.map(({ Icon: IconCmp, label, className, sweepDelayS }) => (
          <div
            key={label}
            className={`absolute z-30 flex flex-col items-center gap-1 ${className}`}
          >
            <div
              className="animate-radar-blip rounded-full border border-cyan-500/35 bg-slate-900/95 p-2 sm:p-2.5"
              style={{
                animationDelay: `${sweepDelayS}s`,
              }}
            >
              <IconCmp
                className="size-4 text-cyan-400 sm:size-[1.15rem]"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <span className="max-w-[4.5rem] text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-slate-500 sm:text-[10px]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
