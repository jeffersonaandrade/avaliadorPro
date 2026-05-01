import type { Metadata } from "next";
import Link from "next/link";
import { SeoPlateInputCta } from "@/components/seo/SeoPlateInputCta";
import { SeoStickyCTA } from "@/components/seo/SeoStickyCTA";

export const metadata: Metadata = {
  title: "Consulta histórico veicular pela placa",
  description:
    "Consulte histórico de veículo pela placa e descubra leilão, sinistro e riscos ocultos antes de comprar.",
};

export default function ConsultaHistoricoVeiculoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-28 sm:px-6 sm:pb-10">
      <article className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Como consultar histórico de um veículo pela placa
          </h1>
          <p className="mt-2 text-sm text-slate-700">
            Descubra se o carro tem leilão, sinistro ou risco oculto antes de comprar.
          </p>
          <Link href="/painel" className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white">
            Consultar agora
          </Link>
        </section>
        <SeoPlateInputCta />
        <section className="space-y-2 text-sm text-slate-700">
          <h2 className="text-lg font-bold text-slate-900">O que você descobre</h2>
          <p>Indícios de leilão, sinistro, roubo/furto, gravame e impacto na margem.</p>
          <h2 className="text-lg font-bold text-slate-900">Riscos ocultos</h2>
          <p>Sem validar histórico, você pode comprar um carro com saída lenta e desvalorização forte.</p>
          <h2 className="text-lg font-bold text-slate-900">Impacto no preço</h2>
          <p>Um carro com histórico pode perder até R$ 8.000 no valor de mercado.</p>
        </section>
        <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
          <h2 className="text-base font-bold text-cyan-900">Consultar placa agora</h2>
          <Link href="/painel" className="mt-3 inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-700 px-5 text-sm font-bold text-white">
            Consultar placa agora
          </Link>
        </section>
      </article>
      <SeoStickyCTA />
    </main>
  );
}

