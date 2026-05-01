import Link from "next/link";

export function SeoProofBlock() {
  return (
    <section className="border-b border-slate-800 bg-slate-950 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-cyan-300/30 bg-slate-900/70 p-5 sm:p-6">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
            Exemplo real
          </h2>
          <div className="mt-3 space-y-1 text-sm leading-relaxed text-slate-200 sm:text-base">
            <p>FIPE: R$ 45.000</p>
            <p>Compra: R$ 39.000</p>
            <p>Lucro esperado: R$ 6.000</p>
          </div>
          <div className="mt-4 rounded-xl border border-red-300/40 bg-red-500/10 p-3">
            <p className="text-sm font-semibold text-red-200 sm:text-base">
              Com histórico de leilão: valor real cai para R$ 34.000.
            </p>
            <p className="mt-1 text-base font-black text-red-300 sm:text-lg">
              👉 prejuízo de R$ 5.000
            </p>
          </div>
          <Link
            href="/painel"
            className="mt-5 inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-cyan-600 px-6 text-sm font-bold text-white transition hover:bg-cyan-500 sm:w-auto"
          >
            Testar com uma placa
          </Link>
        </div>
      </div>
    </section>
  );
}

