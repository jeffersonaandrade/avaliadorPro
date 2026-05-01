import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  Calculator,
  Check,
  ShieldAlert,
} from "lucide-react";

import { RadarAnimation } from "@/components/landing/RadarAnimation";
import { SeoProofBlock } from "@/components/landing/SeoProofBlock";
import { StickyLandingCTA } from "@/components/landing/StickyLandingCTA";
import { PLANOS_LANDING } from "@/lib/planos-marketing";

export const metadata = {
  title: "Descubra em segundos se um carro dá lucro ou prejuízo",
  description:
    "Evite prejuízo em carros de leilão, sinistro ou com histórico oculto. Calcule preço máximo seguro para revenda.",
};

function CtaPrimary({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-700 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:via-cyan-500 hover:to-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:px-8 sm:py-4 sm:text-lg ${className}`}
    >
      {children}
    </Link>
  );
}

function CtaAssinar({
  href,
  children,
  variant = "default",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "default" | "featured";
  className?: string;
}) {
  const base =
    variant === "featured"
      ? "bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/30 hover:from-orange-400 hover:to-orange-500"
      : "border border-slate-600 bg-slate-800/80 text-slate-100 hover:border-cyan-500/40 hover:bg-slate-800";
  return (
    <Link
      href={href}
      className={`inline-flex w-full items-center justify-center rounded-xl px-5 py-3.5 text-center text-sm font-semibold shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 sm:text-base ${base} ${className}`}
    >
      {children}
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-bold tracking-tight sm:text-xl">
            Avaliador{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-transparent">
              PRO
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/painel"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:text-white sm:inline"
            >
              Demo
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 shadow-sm transition hover:border-cyan-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-800 px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(34,211,238,0.12),transparent),radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(249,115,22,0.06),transparent)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-orange-400/90 sm:text-sm">
              B2B · pátio · decisão com dados
            </p>
            <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[2.75rem] lg:leading-[1.12]">
              Descubra em segundos se um carro dá{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-transparent">
                lucro ou prejuízo
              </span>
              .
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
              Evite prejuízo em carros de leilão, sinistro ou com histórico oculto.
              Descubra quanto pagar com segurança antes de fechar negócio.
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold text-red-300 sm:text-base">
              Se você paga FIPE sem validar histórico, assume risco real de
              prejuízo.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <CtaPrimary href="/painel">Avaliar primeira placa</CtaPrimary>
              <Link
                href="/#planos"
                className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Ver planos →
              </Link>
            </div>
          </div>
        </section>

        <SeoProofBlock />

        <section
          className="border-b border-slate-800 bg-slate-900/40 px-4 py-14 sm:px-6 sm:py-20"
          aria-labelledby="radar-heading"
        >
          <div className="mx-auto max-w-6xl">
            <h2
              id="radar-heading"
              className="mb-10 text-center text-2xl font-bold tracking-tight text-white sm:mb-12 sm:text-3xl"
            >
              Raio-X completo em tempo real
            </h2>
            <div className="mx-auto max-w-5xl opacity-80">
              <RadarAnimation />
            </div>
            <p className="mx-auto mt-8 max-w-xl text-center text-sm text-slate-500 sm:text-base">
              Visualização ilustrativa dos sinais que o motor cruza com FIPE,
              histórico e consultas de risco para compor o teto de compra.
            </p>
          </div>
        </section>

        <section
          className="border-b border-slate-800 bg-slate-950 px-4 py-14 sm:px-6 sm:py-20"
          aria-labelledby="valor-heading"
        >
          <div className="mx-auto max-w-6xl">
            <h2
              id="valor-heading"
              className="mb-10 text-center text-2xl font-bold text-white sm:mb-12 sm:text-3xl"
            >
              Proteção de margem, do jeito B2B
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
                <div className="mb-4 inline-flex rounded-xl bg-cyan-500/15 p-3 text-cyan-400">
                  <Calculator className="size-6" aria-hidden />
                </div>
                <h3 className="text-lg font-bold text-white">
                  Motor Market-Minus
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                  Não calcule lucro sobre o que você pagou. Calcule o que pagar
                  com base no mercado e no lucro desejado.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
                <div className="mb-4 inline-flex rounded-xl bg-orange-500/15 p-3 text-orange-400">
                  <ShieldAlert className="size-6" aria-hidden />
                </div>
                <h3 className="text-lg font-bold text-white">
                  Inteligência de risco
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                  Descontos automáticos no teto quando há leilão, sinistro,
                  roubo/furto ou gravame nas fontes consultadas.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:col-span-2 sm:p-8 lg:col-span-1">
                <div className="mb-4 inline-flex rounded-xl bg-blue-500/15 p-3 text-blue-400">
                  <BarChart3 className="size-6" aria-hidden />
                </div>
                <h3 className="text-lg font-bold text-white">
                  Veredito matemático
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                  Sem achismos:{" "}
                  <strong className="font-semibold text-slate-200">Viável</strong>
                  , <strong className="font-semibold text-slate-200">Atenção</strong>{" "}
                  ou <strong className="font-semibold text-slate-200">Arriscado</strong>
                  .
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          id="planos"
          className="scroll-mt-20 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 px-4 py-14 sm:px-6 sm:py-20"
          aria-labelledby="planos-heading"
        >
          <div className="mx-auto max-w-6xl">
            <h2
              id="planos-heading"
              className="mb-4 text-center text-2xl font-bold text-white sm:text-3xl"
            >
              Precificação alta margem
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-slate-400 sm:mb-14 sm:text-base">
              Planos pensados para B2B: FIPE mensal, créditos de risco e preços
              de consultas avulsas alinhados à proteção do seu pátio.
            </p>
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
              {PLANOS_LANDING.map((plano) => (
                <div
                  key={plano.slug}
                  className={`relative flex flex-col rounded-2xl p-6 sm:p-8 ${
                    plano.destaque
                      ? "border-2 border-orange-500/70 bg-slate-900/80 shadow-[0_0_40px_rgba(249,115,22,0.12)] ring-1 ring-orange-400/20"
                      : "border border-slate-800 bg-slate-900/50"
                  }`}
                >
                  {plano.destaque ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-orange-500/30">
                      Recomendado
                    </span>
                  ) : null}
                  <h3 className="text-xl font-bold text-white">{plano.nome}</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                    Assinatura mensal
                  </p>
                  <p className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-white">
                      {plano.preco}
                    </span>
                    <span className="text-slate-500">{plano.periodo}</span>
                  </p>
                  <p className="mt-3 text-sm text-slate-400">{plano.tagline}</p>
                  <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-300">
                    <li className="flex gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-cyan-500"
                        aria-hidden
                      />
                      <span>
                        <strong className="font-semibold text-white">
                          {plano.fipeMes}
                        </strong>{" "}
                        consultas FIPE / mês
                      </span>
                    </li>
                    <li className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-cyan-500"
                          aria-hidden
                        />
                        <span>
                          <strong className="font-semibold text-white">
                            {plano.creditosRisco}
                          </strong>{" "}
                          créditos de risco inclusos
                        </span>
                      </div>
                      {plano.creditosDetalhe ? (
                        <p className="ml-6 text-xs leading-snug text-orange-300/90">
                          {plano.creditosDetalhe}
                        </p>
                      ) : null}
                    </li>
                    <li className="flex gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-cyan-500"
                        aria-hidden
                      />
                      <span>Motor completo (teto, veredito, cenários)</span>
                    </li>
                    <li className="flex gap-2 border-t border-slate-800 pt-3 text-slate-300">
                      <span className="text-orange-400/90" aria-hidden>
                        +
                      </span>
                      <span>{plano.extrasRiscoLabel}</span>
                    </li>
                  </ul>
                  <div className="mt-8">
                    <CtaAssinar
                      href={`/cadastro?plano=${plano.slug}`}
                      variant={plano.destaque ? "featured" : "default"}
                    >
                      Assinar {plano.nome}
                    </CtaAssinar>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <CtaPrimary href="/painel" className="w-full max-w-md">
                Descobrir se vale a pena agora
              </CtaPrimary>
            </div>
          </div>
        </section>
      </main>

      <section className="border-t border-slate-800 bg-slate-950 px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-4xl rounded-2xl border border-cyan-400/30 bg-slate-900/70 p-5 text-center sm:p-7">
          <p className="text-lg font-bold text-white sm:text-xl">
            Evite comprar no escuro.
          </p>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Descubra agora se esse carro dá lucro ou prejuízo.
          </p>
          <div className="mt-5">
            <CtaPrimary href="/painel">Analisar veículo agora</CtaPrimary>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center text-sm text-slate-500 sm:flex-row sm:text-left">
          <span className="font-semibold text-slate-300">Avaliador PRO</span>
          <p>© {new Date().getFullYear()} · Dados tratados no servidor.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="font-medium text-cyan-400 hover:text-cyan-300"
            >
              Login
            </Link>
            <Link
              href="/cadastro"
              className="font-medium text-cyan-400 hover:text-cyan-300"
            >
              Cadastro
            </Link>
            <Link
              href="/painel"
              className="font-medium text-slate-400 hover:text-white"
            >
              Painel
            </Link>
          </div>
        </div>
      </footer>
      <StickyLandingCTA />
    </div>
  );
}
