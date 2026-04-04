import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Login",
  description: "Acesse o painel Avaliador PRO.",
};

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
      Carregando…
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
