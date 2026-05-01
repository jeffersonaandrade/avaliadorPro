import type { Metadata } from "next";
import Link from "next/link";
import { SeoSimulationBlock } from "@/components/seo/SeoSimulationBlock";
import { SeoScrollTriggerBanner } from "@/components/seo/SeoScrollTriggerBanner";
import { SeoStickyCTA } from "@/components/seo/SeoStickyCTA";
import { SeoPlateInputCta } from "@/components/seo/SeoPlateInputCta";

export const metadata: Metadata = {
  title: "Vale a pena comprar carro de leilão?",
  description:
    "Carro de leilão vale a pena? Entenda risco, desvalorização e como calcular o preço máximo seguro para comprar sem prejuízo.",
};

export default function ValeAPenaCarroLeilaoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-28 sm:px-6 sm:py-10 sm:pb-10">
      <article className="space-y-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Vale a pena comprar carro de leilão?
        </h1>
        <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
          Muita gente compra porque está barato e descobre o prejuízo só depois.
          Comprar carro de leilão pode dar lucro, mas só quando o preço está
          realmente abaixo do risco. Sem isso, a revenda trava e a margem some.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">
            O que é um carro de leilão
          </h2>
          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            É um veículo vendido em leilão por bancos, seguradoras, financeiras ou
            empresas. O carro pode estar bom, mas também pode carregar histórico
            que pesa na revenda.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">
            Por que carros de leilão são mais baratos
          </h2>
          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            Porque o mercado enxerga mais risco. Mesmo quando o veículo está em
            bom estado, o histórico reduz a confiança de compra e a liquidez no
            pátio. Esse desconto é o que atrai, mas também é onde mora o risco.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">
            Quanto um carro de leilão pode desvalorizar
          </h2>
          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            Depende do histórico e da aceitação do modelo, mas o impacto costuma
            aparecer em dois pontos: preço de revenda menor e mais tempo para
            vender. É por isso que o risco de comprar carro de leilão sem conta
            certa é alto.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">
            Quando vale a pena comprar
          </h2>
          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            Quando o preço está muito abaixo da referência e o histórico não mostra
            risco estrutural crítico. Nesse cenário, comprar carro de leilão pode
            ser uma boa oportunidade para margem.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">
            Quando NÃO vale a pena
          </h2>
          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            Quando há sinistro grave, histórico ruim, sinais de baixa liquidez ou
            margem apertada. Se o carro parece barato, mas não sobra margem real,
            o prejuízo chega na revenda.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">
            Como calcular o preço máximo seguro
          </h2>
          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            O conceito é simples: pegue a venda realista, desconte custos e sua
            margem alvo. O número final é o teto de compra. Pagou acima disso,
            aumenta muito a chance de prejuízo oculto.
          </p>
        </section>

        <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 sm:p-5">
          <h2 className="text-base font-bold text-cyan-900">
            Teste agora com uma placa e descubra o preço máximo seguro
          </h2>
          <p className="mt-1 text-sm text-cyan-800">
            Descubra em segundos se carro de leilão vale a pena para compra e
            revenda.
          </p>
          <Link
            href="/painel"
            className="mt-3 inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-700 px-5 text-sm font-bold text-white transition hover:bg-cyan-800"
          >
            Descobrir se vale a pena agora
          </Link>
        </section>

        <SeoScrollTriggerBanner />
        <SeoPlateInputCta />

        <section className="space-y-2 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
          <h2 className="text-lg font-bold text-red-900">
            ⚠️ O erro que faz lojistas perderem dinheiro
          </h2>
          <p className="text-sm leading-relaxed text-red-900/90">
            A maioria paga FIPE sem verificar histórico. Isso destrói a margem.
          </p>
        </section>

        <SeoSimulationBlock />

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-bold text-slate-900">Links úteis</h2>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/calculadora-preco-carro" className="text-cyan-700 underline">
              Ir para calculadora de preço de carro
            </Link>
            <Link
              href="/vale-a-pena-comprar-carro-de-leilao"
              className="text-cyan-700 underline"
            >
              Ver guia completo de carro de leilão
            </Link>
            <Link href="/" className="text-cyan-700 underline">
              Voltar para página principal
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

