"use client";

import { useEffect, useState } from "react";

import { MOCK_DEMO_USER_ID, isPublicDemoMocksMode } from "@/lib/demo-mocks";
import { obterIdentificadorClienteNavegador } from "@/lib/client-id";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

const mocksCliente = isPublicDemoMocksMode();

/**
 * No painel autenticado, usa `session.user.id`; fallback para UUID do localStorage.
 * Com `NEXT_PUBLIC_USE_MOCKS=true`, prioriza sessão se houver, senão `demo-user`.
 */
export function useIdentificadorCliente(): {
  identificador: string;
  pronto: boolean;
} {
  const [identificador, setIdentificador] = useState(() =>
    mocksCliente ? MOCK_DEMO_USER_ID : ""
  );
  const [pronto, setPronto] = useState(() => mocksCliente);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      const sid = session?.user.id?.trim();
      setIdentificador(
        sid ??
          (mocksCliente
            ? MOCK_DEMO_USER_ID
            : obterIdentificadorClienteNavegador())
      );
      setPronto(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sid = session?.user.id?.trim();
      setIdentificador(
        sid ??
          (mocksCliente
            ? MOCK_DEMO_USER_ID
            : obterIdentificadorClienteNavegador())
      );
      setPronto(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { identificador, pronto };
}
