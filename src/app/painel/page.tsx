import Link from "next/link";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { BuscaPlaca } from "@/components/BuscaPlaca";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { isPublicDemoMocksMode } from "@/lib/demo-mocks";

export const metadata = {
  title: "Painel",
  description: "Consulta por placa e simulação de viabilidade.",
};

export default function PainelPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/80">
      <DemoModeBanner />
      <div className="relative z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-end gap-3 px-5 py-2 sm:px-8">
          <Link
            href="/"
            className="text-xs font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← Site
          </Link>
          {isPublicDemoMocksMode() ? (
            <Link
              href="/admin"
              className="text-xs font-medium text-indigo-600/90 transition hover:text-indigo-800"
              data-testid="link-admin-demo"
            >
              Admin (demo)
            </Link>
          ) : null}
          <SignOutButton />
        </div>
      </div>
      <div
        className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-400/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-slate-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-2xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
        <header className="mb-12 text-center sm:mb-14">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-4 py-1.5 shadow-sm backdrop-blur-sm">
            <span
              className="size-2 rounded-full bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.6)]"
              aria-hidden
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              SaaS · viabilidade veicular
            </span>
          </div>
          <h1 className="text-balance bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl sm:leading-[1.08]">
            Avaliador PRO
          </h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
            Margem real no pátio: consulte a placa com a mesma segurança de uma
            ferramenta enterprise.
          </p>
        </header>

        <div className="rounded-3xl border border-slate-200/90 bg-white/80 p-6 shadow-xl shadow-slate-300/25 backdrop-blur-md sm:p-10 lg:p-12">
          <BuscaPlaca />
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          Dados sensíveis tratados no servidor · conformidade com suas políticas
          de privacidade
        </p>
      </div>
    </main>
  );
}
