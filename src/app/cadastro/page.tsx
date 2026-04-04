import { Suspense } from "react";
import type { Metadata } from "next";

import { CadastroClient } from "./CadastroClient";

export const metadata: Metadata = {
  title: "Cadastro",
  description: "Crie sua conta Avaliador PRO — planos B2B para pátio.",
};

function CadastroFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
      Carregando…
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<CadastroFallback />}>
      <CadastroClient />
    </Suspense>
  );
}
