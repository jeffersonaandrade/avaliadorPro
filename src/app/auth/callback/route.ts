import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { provisionUsuarioAcessoPorAuthUserId } from "@/lib/provision-usuario-acesso";

/**
 * Troca o `code` OAuth / magic link por sessão e provisiona `usuario_acesso` na primeira vez.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const plano = url.searchParams.get("plano");
  const next = url.searchParams.get("next") ?? "/painel";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.redirect(new URL("/login?error=config", url.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* ignorar em contextos sem mutação de cookie */
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback]", error);
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    await provisionUsuarioAcessoPorAuthUserId(user.id, plano, {
      apenasSeNaoExistir: true,
    });
  }

  const redirectTo = new URL(next, url.origin);
  return NextResponse.redirect(redirectTo);
}
