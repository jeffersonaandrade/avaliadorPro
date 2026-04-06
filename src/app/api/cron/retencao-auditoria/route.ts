import { NextResponse } from "next/server";

import { executarRetencaoAuditoriaFinanceira } from "@/lib/auditoria-retencao";

export const dynamic = "force-dynamic";

function autorizadoCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.warn(
      "[cron/retencao-auditoria] CRON_SECRET não definido — rota desabilitada."
    );
    return false;
  }
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token === secret;
}

/**
 * Agendamento diário (ex.: Vercel Cron) com header `Authorization: Bearer <CRON_SECRET>`.
 * GET ou POST.
 */
export async function GET(request: Request) {
  if (!autorizadoCron(request)) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });
  }
  try {
    const resultado = await executarRetencaoAuditoriaFinanceira();
    return NextResponse.json({ ok: true, resultado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
