"use server";

import { redirect } from "next/navigation";

import { provisionUsuarioAcessoPorAuthUserId } from "@/lib/provision-usuario-acesso";
import { createSupabaseServerClient } from "@/utils/supabase/server";

function siteUrlBase(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  const v = process.env.VERCEL_URL?.trim();
  if (v) return `https://${v.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export type AuthActionResult =
  | { ok: true; needsEmailConfirmation?: boolean }
  | { ok: false; message: string };

export async function signUpAction(input: {
  email: string;
  password: string;
  nomeCompleto: string;
  planoSlug: string | null;
}): Promise<AuthActionResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const nome = input.nomeCompleto.trim();
  if (!email || !password || !nome) {
    return { ok: false, message: "Preencha nome, e-mail e senha." };
  }
  if (password.length < 8) {
    return { ok: false, message: "A senha deve ter pelo menos 8 caracteres." };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrlBase()}/auth/callback`,
      data: {
        full_name: nome,
        plano_slug: input.planoSlug ?? "",
      },
    },
  });

  if (error) {
    console.error("[signUpAction]", error);
    return { ok: false, message: error.message };
  }

  const userId = data.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Não foi possível criar o usuário. Tente novamente.",
    };
  }

  const prov = await provisionUsuarioAcessoPorAuthUserId(
    userId,
    input.planoSlug
  );
  if (!prov.ok) {
    return { ok: false, message: prov.erro };
  }

  const needsEmailConfirmation = !data.session;
  return { ok: true, needsEmailConfirmation };
}

export async function signInAction(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password) {
    return { ok: false, message: "Informe e-mail e senha." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (error) {
    console.error("[signInAction]", error);
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

/**
 * Inicia OAuth Google no servidor (PKCE + cookies SSR) e redireciona para o provedor.
 */
export async function signInWithGoogleAction(input: {
  planoSlug?: string | null;
  next?: string;
}): Promise<AuthActionResult | void> {
  const supabase = await createSupabaseServerClient();
  const base = siteUrlBase();
  const nextRaw = (input.next ?? "/painel").trim();
  const next = nextRaw.startsWith("/") ? nextRaw : "/painel";
  const plano = (input.planoSlug ?? "").trim();

  const callback = new URL(`${base}/auth/callback`);
  callback.searchParams.set("next", next);
  if (plano) callback.searchParams.set("plano", plano);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      queryParams: { prompt: "consent" },
    },
  });

  if (error) {
    console.error("[signInWithGoogleAction]", error);
    return { ok: false, message: error.message };
  }
  if (data.url) {
    redirect(data.url);
  }
  return { ok: false, message: "Não foi possível iniciar o login com Google." };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
