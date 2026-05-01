import type { Metadata } from "next";
import Link from "next/link";
import { SeoSimulationBlock } from "@/components/seo/SeoSimulationBlock";
import { SeoScrollTriggerBanner } from "@/components/seo/SeoScrollTriggerBanner";
import { SeoStickyCTA } from "@/components/seo/SeoStickyCTA";

export const metadata: Metadata = {
  title: "Carro recuperado compensa para revenda?",
  description:
    "Carro recuperado compensa? Entenda quando o desconto faz sentido e quando o histórico pode virar prejuízo.",
};

export default function CarroRecuperadoCompensaPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-28 sm:px-6 sm:py-10 sm:pb-10">
      <article className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Carro recuperado compensa?
          </h1>
          <p className="mt-2 text-sm text-slate-700 sm:text-base">
            Depende do preço. Veja como calcular e evitar prejuízo.
          </p>
          <Link href="/painel" className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white">
            Testar com uma placa agora
          </Link>
        </section>

        <SeoScrollTriggerBanner />

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">Quando vale a pena</h2>
          <p className="text-sm text-slate-700">Quando o desconto é agressivo e a liquidez do modelo continua boa.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">Quando NÃO vale a pena</h2>
          <p className="text-sm text-slate-700">Quando o histórico afasta comprador e pressiona preço de saída.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">Erros comuns</h2>
          <p className="text-sm text-slate-700">Entrar só pelo desconto sem calcular impacto real na revenda.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">Riscos ocultos</h2>
          <p className="text-sm text-slate-700">Sinistro, leilão e gravame podem reduzir o valor percebido.</p>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-lg font-bold text-amber-900">Bloco de decisão</h2>
          <p className="text-sm text-amber-900/90">Se pagar acima de R$ 34.500, você entra no prejuízo.</p>
          <Link href="/painel" className="mt-3 inline-flex text-sm font-bold text-amber-900 underline">Analisar veículo agora</Link>
        </section>

        <SeoSimulationBlock />

        <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-bold text-red-900">⚠️ O erro que faz lojistas perderem dinheiro</h2>
          <p className="text-sm text-red-900/90">A maioria paga FIPE sem verificar histórico. Isso destrói a margem.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-bold text-slate-900">Links úteis</h2>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <Link href="/calculadora-preco-carro" className="text-cyan-700 underline">Calculadora de preço</Link>
            <Link href="/vale-a-pena-comprar-carro-de-leilao" className="text-cyan-700 underline">Guia de carro de leilão</Link>
            <Link href="/" className="text-cyan-700 underline">Página principal</Link>
          </div>
        </section>

        <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
          <h2 className="text-base font-bold text-cyan-900">
            Quer saber se esse carro vale a pena? Digite a placa e veja em segundos.
          </h2>
          <Link href="/painel" className="mt-3 inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-700 px-5 text-sm font-bold text-white">
            Analisar veículo agora
          </Link>
        </section>
      </article>
      <SeoStickyCTA />
    </main>
  );
}

