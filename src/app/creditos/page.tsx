import Link from "next/link";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { PLANOS_LANDING } from "@/lib/planos-marketing";

export const metadata = {
  title: "Créditos de blindagem",
  description:
    "Valores por unidade de crédito premium (blindagem completa por placa) conforme o plano.",
};

export default function CreditosPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/80">
      <DemoModeBanner />
      <div className="relative z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-2 sm:px-8">
          <Link
            href="/painel"
            className="text-xs font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← Painel
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-medium text-slate-500 transition hover:text-slate-800"
            >
              Site
            </Link>
            <SignOutButton />
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
        <header className="mb-10 text-center">
          <h1 className="text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Créditos de blindagem
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
            Cada crédito ativa a <strong>blindagem completa</strong> para uma placa (Leilão,
            Sinistro, Roubo/furto e Gravame), com resultado salvo de forma permanente.
          </p>
        </header>

        <ul className="space-y-4">
          {PLANOS_LANDING.map((p) => (
            <li
              key={p.slug}
              className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${
                p.destaque
                  ? "border-indigo-300 ring-2 ring-indigo-100"
                  : "border-slate-200/90"
              }`}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-lg font-bold text-slate-900">{p.nome}</h2>
                <p className="text-sm text-slate-500">
                  Assinatura {p.preco}
                  {p.periodo}
                </p>
              </div>
              <p className="mt-3 text-sm font-semibold text-indigo-900">
                Crédito avulso de blindagem:{" "}
                <span className="tabular-nums">{p.precoCreditoPremiumAvulso}</span>
                <span className="font-normal text-slate-600"> / unidade</span>
              </p>
              {p.creditosRisco > 0 ? (
                <p className="mt-2 text-xs text-slate-600">
                  Inclui <strong>{p.creditosRisco}</strong> créditos no plano mensal.
                  {p.creditosDetalhe ? ` ${p.creditosDetalhe}` : ""}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-600">
                  Créditos de blindagem via compra avulsa ou upgrade de plano.
                </p>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-xs text-slate-500">
          Pagamento e gestão de assinatura serão integrados ao gateway; estes valores refletem a
          estratégia comercial atual.
        </p>
      </div>
    </main>
  );
}
