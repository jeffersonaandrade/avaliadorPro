"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

function normalizarPlaca(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

export function SeoPlateInputCta() {
  const [placa, setPlaca] = useState("");
  const placaNorm = useMemo(() => normalizarPlaca(placa), [placa]);
  const href = placaNorm ? `/painel?placa=${encodeURIComponent(placaNorm)}` : "/painel";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold text-slate-900">
        Descobrir se vale a pena agora
      </h2>
      <p className="mt-1 text-sm text-slate-700">
        Cada compra errada pode custar milhares de reais.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={placa}
          onChange={(e) => setPlaca(e.target.value)}
          placeholder="Digite a placa (ex: ABC1234)"
          className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-cyan-500"
        />
        <Link
          href={href}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white"
        >
          Analisar agora
        </Link>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Resultado em segundos: preco maximo, risco oculto e lucro estimado.
      </p>
    </section>
  );
}

