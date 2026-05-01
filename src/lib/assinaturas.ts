import "server-only";

import {
  clampConsultasFipePosDowngrade,
} from "@/lib/assinaturas-plan-clamp";
import { supabaseAdmin } from "@/lib/supabase";
import {
  limitesPlanoPorSlug,
  type PLANOS_LANDING,
} from "@/lib/planos-marketing";
import { normalizarSlugPlanoAuth } from "@/lib/provision-usuario-acesso";

const TABELA_ASSINATURAS = "assinaturas";
const TABELA_ACESSO = "usuario_acesso";

function mesReferenciaUtcAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Ciclo de cobrança padrão (dias). Renovação via webhook pode somar a partir da expiração atual. */
export const DIAS_CICLO_ASSINATURA_PADRAO = 30;

export type PlanoAssinatura = (typeof PLANOS_LANDING)[number]["slug"];

export type StatusAssinatura = "ativo" | "pendente" | "cancelado";

export type AssinaturaRow = {
  id: string;
  cliente_id: string;
  plano: PlanoAssinatura;
  status: StatusAssinatura;
  data_inicio: string;
  data_expiracao: string;
  origem_pagamento: string | null;
  criado_em: string;
};

/** Se `true` (default), sem linha em `assinaturas` ainda usa `usuario_acesso.plano_ativo` / `plano` (migração gradual). */
export function acessoLegacySemAssinatura(): boolean {
  return (
    String(process.env.AVALIADOR_LEGACY_ACESSO_SEM_ASSINATURA ?? "true")
      .trim()
      .toLowerCase() !== "false"
  );
}

export { clampConsultasFipePosDowngrade };

function addDaysUtc(iso: string, dias: number): string {
  const t = Date.parse(iso);
  const base = Number.isFinite(t) ? t : Date.now();
  return new Date(base + dias * 86_400_000).toISOString();
}

function agoraIso(): string {
  return new Date().toISOString();
}

/**
 * Assinatura **ativa** e **não expirada** (mais recente por `data_inicio`).
 */
export async function obterAssinaturaVigente(
  clienteId: string
): Promise<AssinaturaRow | null> {
  const id = clienteId.trim();
  if (!id) return null;

  const now = agoraIso();
  const { data, error } = await supabaseAdmin
    .from(TABELA_ASSINATURAS)
    .select(
      "id, cliente_id, plano, status, data_inicio, data_expiracao, origem_pagamento, criado_em"
    )
    .eq("cliente_id", id)
    .eq("status", "ativo")
    .gt("data_expiracao", now)
    .order("data_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[assinaturas] obterAssinaturaVigente", error);
    return null;
  }
  if (!data) return null;
  return data as AssinaturaRow;
}

export async function usuarioTemPlanoAtivo(clienteId: string): Promise<boolean> {
  const row = await obterAssinaturaVigente(clienteId);
  return row !== null;
}

async function cancelarAssinaturasAtivas(clienteId: string): Promise<void> {
  const id = clienteId.trim();
  if (!id) return;
  const { error } = await supabaseAdmin
    .from(TABELA_ASSINATURAS)
    .update({ status: "cancelado" })
    .eq("cliente_id", id)
    .eq("status", "ativo");
  if (error) {
    console.error("[assinaturas] cancelar ativas", error);
  }
}

async function aplicarUsuarioAcessoPosAtivacao(
  clienteId: string,
  slug: PlanoAssinatura,
  opts: {
    resetConsumoMensal: boolean;
    /** Quando troca de plano sem reset total de mês (ex.: manual). */
    utilizadasAtuais?: number;
  }
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const id = clienteId.trim();
  const { consultasFipeLimite, creditosPremium } = limitesPlanoPorSlug(slug);
  const mes = mesReferenciaUtcAtual();
  const agora = agoraIso();

  let consultasUtil = 0;
  let excedentes = 0;
  let valorExc = 0;

  if (opts.resetConsumoMensal) {
    consultasUtil = 0;
    excedentes = 0;
    valorExc = 0;
  } else {
    let u = opts.utilizadasAtuais;
    if (u === undefined) {
      const { data: cur } = await supabaseAdmin
        .from(TABELA_ACESSO)
        .select("consultas_fipe_utilizadas")
        .eq("identificador", id)
        .maybeSingle();
      u = Math.max(0, Number(cur?.consultas_fipe_utilizadas) || 0);
    }
    consultasUtil = clampConsultasFipePosDowngrade(u, consultasFipeLimite);
    const { data: row } = await supabaseAdmin
      .from(TABELA_ACESSO)
      .select("consultas_excedentes, valor_total_excedente")
      .eq("identificador", id)
      .maybeSingle();
    excedentes = Math.max(0, Number(row?.consultas_excedentes) || 0);
    const ve = Number(row?.valor_total_excedente);
    valorExc = Number.isFinite(ve) ? Math.round(ve * 100) / 100 : 0;
  }

  const { data: existente } = await supabaseAdmin
    .from(TABELA_ACESSO)
    .select("creditos_premium")
    .eq("identificador", id)
    .maybeSingle();

  const creditosAtuais = Math.max(0, Number(existente?.creditos_premium) || 0);
  const creditosNovos = Math.max(creditosAtuais, creditosPremium);

  const { error } = await supabaseAdmin.from(TABELA_ACESSO).upsert(
    {
      identificador: id,
      plano_ativo: true,
      plano: slug,
      consultas_fipe_limite: consultasFipeLimite,
      consultas_fipe_utilizadas: consultasUtil,
      consultas_excedentes: excedentes,
      valor_total_excedente: valorExc,
      fipe_mes_referencia: mes,
      creditos_premium: opts.resetConsumoMensal ? creditosPremium : creditosNovos,
      atualizado_em: agora,
    },
    { onConflict: "identificador" }
  );

  if (error) {
    console.error("[assinaturas] aplicar usuario_acesso", error);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

export type AtivarPlanoUsuarioOpts = {
  origem_pagamento?: string | null;
  /**
   * `false` (default): se já houver assinatura **ativa** do mesmo plano e dentro da vigência,
   * não altera datas nem consumo (idempotente — duplo clique no admin).
   * `true`: renova somando o ciclo a partir de `max(agora, data_expiracao_atual)` (webhook de pagamento).
   */
  forcarRenovacao?: boolean;
};

export type AtivarPlanoUsuarioResult =
  | { ok: true; idempotente?: boolean; assinatura_id?: string }
  | { ok: false; erro: string };

/**
 * Cria ou renova assinatura ativa e sincroniza `usuario_acesso` (limites + consumo).
 */
export async function ativarPlanoUsuario(
  clienteId: string,
  planoRaw: string | null | undefined,
  opts?: AtivarPlanoUsuarioOpts
): Promise<AtivarPlanoUsuarioResult> {
  const id = clienteId.trim();
  if (!id) return { ok: false, erro: "cliente_id inválido." };

  const slug = normalizarSlugPlanoAuth(planoRaw);
  const now = agoraIso();
  const vigente = await obterAssinaturaVigente(id);

  if (
    vigente &&
    vigente.plano === slug &&
    !opts?.forcarRenovacao
  ) {
    return { ok: true, idempotente: true, assinatura_id: vigente.id };
  }

  if (vigente && vigente.plano === slug && opts?.forcarRenovacao) {
    const base = Math.max(Date.parse(now), Date.parse(vigente.data_expiracao));
    const novaExp = new Date(
      base + DIAS_CICLO_ASSINATURA_PADRAO * 86_400_000
    ).toISOString();
    const { data: upd, error } = await supabaseAdmin
      .from(TABELA_ASSINATURAS)
      .update({
        data_expiracao: novaExp,
        origem_pagamento:
          opts.origem_pagamento?.trim() || vigente.origem_pagamento,
      })
      .eq("id", vigente.id)
      .select("id")
      .maybeSingle();
    if (error || !upd) {
      return { ok: false, erro: error?.message ?? "Falha ao renovar assinatura." };
    }
    /** Renovação não zera consumo do mês; só estende vigência na assinatura. */
    return { ok: true, assinatura_id: vigente.id };
  }

  await cancelarAssinaturasAtivas(id);

  const inicio = now;
  const expiracao = addDaysUtc(now, DIAS_CICLO_ASSINATURA_PADRAO);

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from(TABELA_ASSINATURAS)
    .insert({
      cliente_id: id,
      plano: slug,
      status: "ativo",
      data_inicio: inicio,
      data_expiracao: expiracao,
      origem_pagamento: opts?.origem_pagamento?.trim() || null,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("[assinaturas] insert", insErr);
    return { ok: false, erro: insErr?.message ?? "Falha ao criar assinatura." };
  }

  const r = await aplicarUsuarioAcessoPosAtivacao(id, slug, {
    resetConsumoMensal: true,
  });
  if (!r.ok) return r;

  return { ok: true, assinatura_id: inserted.id as string };
}

/**
 * Troca de plano mantendo vigência atual; ajusta limites e **clamp** de FIPE inclusa (downgrade).
 */
export async function alterarPlanoManual(
  clienteId: string,
  planoRaw: string | null | undefined
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const id = clienteId.trim();
  if (!id) return { ok: false, erro: "cliente_id inválido." };

  const slug = normalizarSlugPlanoAuth(planoRaw);
  const vigente = await obterAssinaturaVigente(id);
  if (!vigente) {
    return { ok: false, erro: "Nenhuma assinatura ativa para alterar." };
  }

  const { consultasFipeLimite, creditosPremium } = limitesPlanoPorSlug(slug);
  const { data: uRow } = await supabaseAdmin
    .from(TABELA_ACESSO)
    .select("consultas_fipe_utilizadas, creditos_premium")
    .eq("identificador", id)
    .maybeSingle();

  const utilizadas = Math.max(0, Number(uRow?.consultas_fipe_utilizadas) || 0);
  const clamped = clampConsultasFipePosDowngrade(utilizadas, consultasFipeLimite);
  const creditosAtuais = Math.max(0, Number(uRow?.creditos_premium) || 0);
  const creditosNovos = Math.max(creditosAtuais, creditosPremium);

  const { error: e1 } = await supabaseAdmin
    .from(TABELA_ASSINATURAS)
    .update({ plano: slug })
    .eq("id", vigente.id);

  if (e1) {
    return { ok: false, erro: e1.message };
  }

  const { error: e2 } = await supabaseAdmin
    .from(TABELA_ACESSO)
    .update({
      plano: slug,
      consultas_fipe_limite: consultasFipeLimite,
      consultas_fipe_utilizadas: clamped,
      creditos_premium: creditosNovos,
      atualizado_em: agoraIso(),
    })
    .eq("identificador", id);

  if (e2) {
    return { ok: false, erro: e2.message };
  }
  return { ok: true };
}

export async function cancelarAssinatura(
  clienteId: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const id = clienteId.trim();
  if (!id) return { ok: false, erro: "cliente_id inválido." };

  await cancelarAssinaturasAtivas(id);

  const { error } = await supabaseAdmin
    .from(TABELA_ACESSO)
    .update({
      plano_ativo: false,
      atualizado_em: agoraIso(),
    })
    .eq("identificador", id);

  if (error) {
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

/**
 * Reativa assinatura (ex.: após falha de pagamento resolvida) — novo ciclo de 30 dias a partir de agora.
 */
export async function ativarAssinaturaManual(
  clienteId: string,
  planoRaw: string | null | undefined,
  origem?: string | null
): Promise<AtivarPlanoUsuarioResult> {
  return ativarPlanoUsuario(clienteId, planoRaw, {
    origem_pagamento: origem ?? "manual_reativacao",
  });
}

export type ResumoAssinaturaCliente = {
  temAssinatura: boolean;
  plano: PlanoAssinatura | null;
  status: StatusAssinatura | "expirado" | null;
  dataInicio: string | null;
  dataExpiracao: string | null;
};

/**
 * Para UI: última assinatura relevante (ativa vigente ou última linha para derivar expirado/pendente).
 */
export async function obterResumoAssinaturaParaUi(
  clienteId: string
): Promise<ResumoAssinaturaCliente> {
  const id = clienteId.trim();
  if (!id) {
    return {
      temAssinatura: false,
      plano: null,
      status: null,
      dataInicio: null,
      dataExpiracao: null,
    };
  }

  const vig = await obterAssinaturaVigente(id);
  if (vig) {
    return {
      temAssinatura: true,
      plano: vig.plano,
      status: "ativo",
      dataInicio: vig.data_inicio,
      dataExpiracao: vig.data_expiracao,
    };
  }

  const { data } = await supabaseAdmin
    .from(TABELA_ASSINATURAS)
    .select("plano, status, data_inicio, data_expiracao")
    .eq("cliente_id", id)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      temAssinatura: false,
      plano: null,
      status: null,
      dataInicio: null,
      dataExpiracao: null,
    };
  }

  const exp = Date.parse(data.data_expiracao);
  const expirado =
    data.status === "ativo" && Number.isFinite(exp) && exp <= Date.now();

  return {
    temAssinatura: true,
    plano: data.plano as PlanoAssinatura,
    status: expirado
      ? "expirado"
      : (data.status as StatusAssinatura),
    dataInicio: data.data_inicio,
    dataExpiracao: data.data_expiracao,
  };
}
