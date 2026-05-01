"use server";

import {
  alterarPlanoManual,
  ativarAssinaturaManual,
  ativarPlanoUsuario,
  cancelarAssinatura,
} from "@/lib/assinaturas";

function verificarAdmin(secret: string | undefined): boolean {
  const esperado = String(process.env.AVALIADOR_ADMIN_SECRET ?? "").trim();
  if (!esperado) {
    return process.env.NODE_ENV === "development";
  }
  return (secret ?? "").trim() === esperado;
}

export type AdminAssinaturaResult =
  | { ok: true; idempotente?: boolean }
  | { ok: false; erro: string };

export async function adminAtivarPlanoAction(
  clienteId: string,
  plano: string,
  adminSecret?: string
): Promise<AdminAssinaturaResult> {
  if (!verificarAdmin(adminSecret)) {
    return {
      ok: false,
      erro:
        "Acesso negado. Defina AVALIADOR_ADMIN_SECRET no servidor e informe o mesmo valor abaixo (ou use NODE_ENV=development sem secret).",
    };
  }
  const r = await ativarPlanoUsuario(clienteId, plano, {
    origem_pagamento: "admin_ui",
  });
  if (!r.ok) return r;
  return { ok: true, idempotente: r.idempotente };
}

export async function adminAlterarPlanoManualAction(
  clienteId: string,
  plano: string,
  adminSecret?: string
): Promise<AdminAssinaturaResult> {
  if (!verificarAdmin(adminSecret)) {
    return {
      ok: false,
      erro:
        "Acesso negado. Defina AVALIADOR_ADMIN_SECRET no servidor e informe o mesmo valor abaixo (ou use NODE_ENV=development sem secret).",
    };
  }
  return alterarPlanoManual(clienteId, plano);
}

export async function adminAtivarAssinaturaManualAction(
  clienteId: string,
  plano: string,
  adminSecret?: string
): Promise<AdminAssinaturaResult> {
  if (!verificarAdmin(adminSecret)) {
    return {
      ok: false,
      erro:
        "Acesso negado. Defina AVALIADOR_ADMIN_SECRET no servidor e informe o mesmo valor abaixo (ou use NODE_ENV=development sem secret).",
    };
  }
  const r = await ativarAssinaturaManual(clienteId, plano, "admin_reativacao");
  if (!r.ok) return r;
  return { ok: true };
}

export async function adminCancelarAssinaturaAction(
  clienteId: string,
  adminSecret?: string
): Promise<AdminAssinaturaResult> {
  if (!verificarAdmin(adminSecret)) {
    return {
      ok: false,
      erro:
        "Acesso negado. Defina AVALIADOR_ADMIN_SECRET no servidor e informe o mesmo valor abaixo (ou use NODE_ENV=development sem secret).",
    };
  }
  return cancelarAssinatura(clienteId);
}
