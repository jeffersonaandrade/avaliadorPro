"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition, type FormEvent } from "react";
import { Building2, Quote } from "lucide-react";

import { signInWithGoogleAction, signUpAction } from "@/actions/auth-actions";
import { SignupProgressBar } from "@/components/auth/SignupProgressBar";
import { labelPlanoFromSlug } from "@/lib/planos-marketing";

type Feedback = { tipo: "sucesso" | "erro"; mensagem: string } | null;

export function CadastroClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planoParam = searchParams.get("plano");
  const planoLabel = labelPlanoFromSlug(planoParam);
  const planoSelecionado = Boolean(planoLabel);

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [enviando, setEnviando] = useState(false);
  const [oauthPending, startGoogleOAuth] = useTransition();

  const handleGoogle = useCallback(() => {
    setFeedback(null);
    startGoogleOAuth(() => {
      void (async () => {
        const result = await signInWithGoogleAction({
          planoSlug: planoParam,
          next: "/painel",
        });
        if (result && !result.ok) {
          setFeedback({ tipo: "erro", mensagem: result.message });
        }
      })();
    });
  }, [planoParam]);

  const handleCadastro = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setFeedback(null);

      if (!nomeCompleto.trim() || !email.trim() || !senha) {
        setFeedback({
          tipo: "erro",
          mensagem: "Preencha todos os campos obrigatórios.",
        });
        return;
      }
      if (senha.length < 8) {
        setFeedback({
          tipo: "erro",
          mensagem: "Use pelo menos 8 caracteres na senha.",
        });
        return;
      }

      setEnviando(true);
      const result = await signUpAction({
        email: email.trim(),
        password: senha,
        nomeCompleto: nomeCompleto.trim(),
        planoSlug: planoParam,
      });
      setEnviando(false);

      if (!result.ok) {
        setFeedback({ tipo: "erro", mensagem: result.message });
        return;
      }

      if (result.needsEmailConfirmation) {
        setFeedback({
          tipo: "sucesso",
          mensagem:
            "Conta criada. Verifique seu e-mail para confirmar o cadastro antes de acessar o painel.",
        });
        return;
      }

      router.refresh();
      router.push("/painel");
    },
    [nomeCompleto, email, senha, planoParam, router]
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
            href="/login"
            className="text-sm font-medium text-cyan-400/90 hover:text-cyan-300"
          >
            Já tenho conta
          </Link>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-4.25rem)] max-w-6xl lg:grid-cols-2">
        <div className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-12 lg:py-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <SignupProgressBar step={2} planoSelecionado={planoSelecionado} />
            </div>

            {planoLabel ? (
              <p className="mb-4 rounded-lg border border-cyan-500/25 bg-[#0a1628]/90 px-4 py-3 text-sm text-slate-200 shadow-[inset_0_1px_0_0_rgba(34,211,238,0.08)]">
                <span className="text-slate-400">Plano selecionado:</span>{" "}
                <strong className="font-semibold text-cyan-300">
                  {planoLabel}
                </strong>
              </p>
            ) : (
              <p className="mb-4 text-sm text-slate-400">
                Escolha um plano na landing (
                <code className="text-cyan-500/90">?plano=</code>) para
                vincular limites de FIPE e créditos ao cadastro.
              </p>
            )}

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Cadastro
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              E-mail e senha ou Google — cotas conforme o plano (Starter 20 FIPE
              / 0 risco · PRO 150 / 3 · Premium 300 / 10).
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleCadastro} noValidate>
              <div>
                <label
                  htmlFor="cadastro-nome"
                  className="block text-sm font-medium text-slate-300"
                >
                  Nome
                </label>
                <input
                  id="cadastro-nome"
                  name="nomeCompleto"
                  type="text"
                  autoComplete="name"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label
                  htmlFor="cadastro-email"
                  className="block text-sm font-medium text-slate-300"
                >
                  E-mail
                </label>
                <input
                  id="cadastro-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                  placeholder="voce@sualoja.com.br"
                />
              </div>
              <div>
                <label
                  htmlFor="cadastro-senha"
                  className="block text-sm font-medium text-slate-300"
                >
                  Senha
                </label>
                <input
                  id="cadastro-senha"
                  name="senha"
                  type="password"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

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
                className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-800 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-500 hover:to-cyan-700 disabled:opacity-60"
              >
                {enviando ? "Criando conta…" : "Criar conta"}
              </button>
            </form>

            <div className="relative my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                ou
              </span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={oauthPending || enviando}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-600 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-100 disabled:opacity-60"
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
                {oauthPending ? "Redirecionando…" : "Entrar com Google"}
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">
                Login social com o mesmo redirect seguro (PKCE) do servidor
              </p>
            </div>

            <p className="mt-8 text-center text-sm text-slate-500">
              Já tem uma conta?{" "}
              <Link
                href="/login"
                className="font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Faça login
              </Link>
            </p>
          </div>
        </div>

        <div className="relative hidden flex-col justify-center border-l border-slate-800 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-950 px-10 py-16 lg:flex">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 20%, rgba(34,211,238,0.14) 0%, transparent 45%), radial-gradient(circle at 70% 80%, rgba(6,182,212,0.06) 0%, transparent 42%)",
            }}
            aria-hidden
          />
          <div className="relative">
            <Building2
              className="mb-6 size-10 text-cyan-500/80"
              strokeWidth={1.25}
              aria-hidden
            />
            <Quote className="mb-4 size-8 text-cyan-500/50" aria-hidden />
            <blockquote className="text-lg font-medium leading-relaxed text-slate-200">
              Reduzimos retrabalho no pátio: uma placa, um teto de compra e um
              veredito claro para o gestor decidir na hora.
            </blockquote>
            <p className="mt-6 text-sm font-medium text-cyan-400/80">
              — Operações B2B · Avaliador PRO
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
