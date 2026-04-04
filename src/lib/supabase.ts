import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL.");
  }
  return url;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return key;
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "Defina SUPABASE_SERVICE_ROLE_KEY no servidor (nunca use NEXT_PUBLIC_). " +
        "Necessário para ignorar RLS nas Server Actions."
    );
  }
  return key;
}

function createLazyClient(factory: () => SupabaseClient): SupabaseClient {
  let client: SupabaseClient | undefined;
  return new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
      if (!client) {
        client = factory();
      }
      const value = Reflect.get(client as object, prop, receiver);
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  });
}

/**
 * Cliente público (anon key). Use em Server Components / Actions quando RLS permitir.
 */
export const supabase: SupabaseClient = createLazyClient(() =>
  createClient(getUrl(), getAnonKey())
);

/**
 * Cliente service_role — **somente servidor** (este módulo já tem `server-only`).
 * Contorna RLS; não importe em arquivos com `"use client"`.
 */
export const supabaseAdmin: SupabaseClient = createLazyClient(() =>
  createClient(getUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
);
