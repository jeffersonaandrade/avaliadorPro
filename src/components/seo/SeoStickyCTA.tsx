"use client";

import Link from "next/link";

export function SeoStickyCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
      <Link
        href="/painel"
        className="inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
      >
        Analisar placa
      </Link>
      <p className="mt-1 text-center text-[11px] font-medium text-slate-600">
        Descubra se vale a pena em 5 segundos
      </p>
    </div>
  );
}

