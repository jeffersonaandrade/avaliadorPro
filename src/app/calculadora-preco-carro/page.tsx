import type { Metadata } from "next";
import Link from "next/link";
import { SeoSimulationBlock } from "@/components/seo/SeoSimulationBlock";
import { SeoScrollTriggerBanner } from "@/components/seo/SeoScrollTriggerBanner";
import { SeoStickyCTA } from "@/components/seo/SeoStickyCTA";
import { SeoPlateInputCta } from "@/components/seo/SeoPlateInputCta";

export const metadata: Metadata = {
  title: "Calculadora de preço de carro para revenda",
  description:
    "Calcule quanto pagar em um carro usado para revenda e evite prejuízo com teto de compra seguro.",
};

export default function CalculadoraPrecoCarroPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-28 sm:px-6 sm:py-10 sm:pb-10">
      <article className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Calculadora de preço de carro para revenda
          </h1>
          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            Descubra quanto pagar para não entrar no prejuízo. Em vez de comprar no
            escuro, você valida risco, margem e preço máximo seguro.
          </p>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>• Quanto pagar no máximo</li>
            <li>• Quanto você pode perder se pagar FIPE</li>
            <li>• Estratégia de negociação pronta</li>
          </ul>
          <Link
            href="/painel"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Descobrir se vale a pena agora
          </Link>
        </section>

        <SeoScrollTriggerBanner />
        <SeoPlateInputCta />
        <SeoSimulationBlock />

        <section className="space-y-2 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
          <h2 className="text-lg font-bold text-red-900">
            ⚠️ O erro que faz lojistas perderem dinheiro
          </h2>
          <p className="text-sm leading-relaxed text-red-900/90">
            A maioria paga FIPE sem verificar histórico. Isso destrói a margem.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-bold text-slate-900">Links úteis</h2>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/calculadora-preco-carro" className="text-cyan-700 underline">
              Voltar para calculadora de preço
            </Link>
            <Link
              href="/vale-a-pena-comprar-carro-de-leilao"
              className="text-cyan-700 underline"
            >
              Ver guia de carro de leilão
            </Link>
            <Link href="/" className="text-cyan-700 underline">
              Ir para página principal
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 sm:p-5">
          <h2 className="text-base font-bold text-cyan-900">
            Quer saber se esse carro vale a pena?
          </h2>
          <p className="mt-1 text-sm text-cyan-800">
            Digite a placa e veja em segundos.
          </p>
          <Link
            href="/painel"
            className="mt-3 inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-700 px-5 text-sm font-bold text-white transition hover:bg-cyan-800"
          >
            Analisar veículo agora
          </Link>
        </section>
      </article>
      <SeoStickyCTA />
    </main>
  );
}

