import { isPublicDemoMocksMode, mockUserAcesso } from "@/lib/demo-mocks";

/** Faixa fixa no topo quando `NEXT_PUBLIC_USE_MOCKS=true`. */
export function DemoModeBanner() {
  if (!isPublicDemoMocksMode()) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] border-b border-violet-500/40 bg-gradient-to-r from-violet-950/95 via-amber-950/90 to-violet-950/95 px-4 py-2.5 text-center shadow-lg shadow-violet-950/40 backdrop-blur-sm"
    >
      <p className="text-xs font-medium leading-snug text-amber-100 sm:text-sm">
        <span className="mr-1.5" aria-hidden>
          🛠️
        </span>
        MODO DEMONSTRAÇÃO ATIVO: Dados simulados, sem custo de API e sem
        necessidade de login.{" "}
        <span className="whitespace-nowrap text-violet-200">
          Plano: {mockUserAcesso.plano} · {mockUserAcesso.fipe_limite} FIPE /{" "}
          {mockUserAcesso.creditos_premium} créditos.
        </span>
      </p>
    </div>
  );
}
