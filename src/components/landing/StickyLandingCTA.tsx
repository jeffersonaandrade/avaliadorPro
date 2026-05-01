import Link from "next/link";

export function StickyLandingCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-700 bg-slate-950/95 p-3 backdrop-blur sm:hidden">
      <p className="mb-2 text-center text-xs font-semibold text-slate-300">
        Descubra em 5 segundos
      </p>
      <Link
        href="/painel"
        className="inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-cyan-600 px-4 text-sm font-bold text-white"
      >
        Analisar placa
      </Link>
    </div>
  );
}

