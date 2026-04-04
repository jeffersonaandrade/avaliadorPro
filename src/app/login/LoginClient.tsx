"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition, type FormEvent } from "react";
import { LogIn } from "lucide-react";

import { signInAction, signInWithGoogleAction } from "@/actions/auth-actions";

type Feedback = { tipo: "sucesso" | "erro"; mensagem: string } | null;

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/painel";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [enviando, setEnviando] = useState(false);
  const [oauthPending, startGoogleOAuth] = useTransition();

  const handleGoogle = useCallback(() => {
    setFeedback(null);
    const next = nextPath.startsWith("/") ? nextPath : "/painel";
    startGoogleOAuth(() => {
      void (async () => {
        const result = await signInWithGoogleAction({ next });
        if (result && !result.ok) {
          setFeedback({ tipo: "erro", mensagem: result.message });
        }
      })();
    });
  }, [nextPath]);

  const handleLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setFeedback(null);

      if (!email.trim() || !senha) {
        setFeedback({
          tipo: "erro",
          mensagem: "Informe e-mail e senha.",
        });
        return;
      }

      setEnviando(true);
      const result = await signInAction({
        email: email.trim(),
        password: senha,
      });
      setEnviando(false);

      if (!result.ok) {
        setFeedback({ tipo: "erro", mensagem: result.message });
        return;
      }

      router.refresh();
      router.push(nextPath.startsWith("/") ? nextPath : "/painel");
    },
    [email, senha, nextPath, router]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Avaliador{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-transparent">
              PRO
            </span>
          </Link>
          <Link
            href="/cadastro"
            className="text-sm font-medium text-cyan-400/90 hover:text-cyan-300"
          >
            Criar conta
          </Link>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-4.25rem)] max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl shadow-black/40 backdrop-blur-sm sm:p-10">
          <div className="mb-6 inline-flex rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
            <LogIn className="size-7" strokeWidth={1.5} aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Entrar no painel
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Use sua conta Supabase (e-mail ou Google).
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={oauthPending || enviando}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-600 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100 disabled:opacity-60"
            >
              <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {oauthPending ? "Abrindo Google…" : "Entrar com Google"}
            </button>
          </div>

          <div className="relative my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              ou e-mail
            </span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <form className="space-y-5" onSubmit={handleLogin} noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-slate-300"
              >
                E-mail
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                placeholder="voce@sualoja.com.br"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="login-senha"
                  className="block text-sm font-medium text-slate-300"
                >
                  Senha
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-orange-400/90 hover:text-orange-300"
                  onClick={() =>
                    setFeedback({
                      tipo: "erro",
                      mensagem:
                        "Recuperação de senha: use o fluxo do Supabase Auth (e-mail) ou o painel do projeto.",
                    })
                  }
                >
                  Esqueceu a senha?
                </button>
              </div>
              <input
                id="login-senha"
                name="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                placeholder="••••••••"
              />
            </div>

            {searchParams.get("error") === "auth" ? (
              <div
                role="alert"
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              >
                Falha na autenticação. Tente novamente ou use outro método.
              </div>
            ) : null}

            {feedback ? (
              <div
                role="alert"
                className={`rounded-xl border px-4 py-3 text-sm ${
                  feedback.tipo === "sucesso"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                    : "border-red-500/40 bg-red-500/10 text-red-100"
                }`}
              >
                {feedback.mensagem}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={enviando || oauthPending}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-400 hover:to-orange-500 disabled:opacity-60"
            >
              {enviando ? "Entrando…" : "Entrar no painel"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Ainda não tem conta?{" "}
            <Link
              href="/"
              className="font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Conheça os planos
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
