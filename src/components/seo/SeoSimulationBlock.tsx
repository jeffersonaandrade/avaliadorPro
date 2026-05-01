import Link from "next/link";

export function SeoSimulationBlock() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <h2 className="text-lg font-bold text-slate-900">Exemplo real</h2>
      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        <li>FIPE: R$ 45.000</li>
        <li>Compra ideal: R$ 37.000</li>
        <li>Lucro possível: R$ 6.000</li>
      </ul>
      <Link
        href="/painel"
        className="mt-3 inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white"
      >
        Testar com um carro real
      </Link>
    </section>
  );
}

