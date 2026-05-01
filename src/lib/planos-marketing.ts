/** Slugs em `?plano=` na landing e cadastro (Supabase Auth / billing depois). */
export const PLANOS_LANDING = [
  {
    slug: "starter",
    nome: "STARTER",
    preco: "R$ 39,90",
    periodo: "/mês",
    /** Consultas de placa (resolução / persistência nova) por mês civil UTC. */
    fipeMes: 10,
    creditosRisco: 0,
    /** Texto abaixo da linha de créditos (opcional). */
    creditosDetalhe: null as string | null,
    /** Cobrança por consulta FIPE após esgotar a cota mensal (R$). */
    fipeExcedenteReais: 1.49,
    /** Crédito de blindagem completa (pacote com Renainf) — avulso. */
    precoCreditoPremiumAvulso: "R$ 39,90",
    extrasRiscoLabel:
      "Créditos extras de blindagem: R$ 39,90 cada.",
    tagline: "Ideal para quem avalia poucos carros.",
    destaque: false,
  },
  {
    slug: "pro",
    nome: "PRO",
    preco: "R$ 99,90",
    periodo: "/mês",
    fipeMes: 30,
    creditosRisco: 1,
    creditosDetalhe: null as string | null,
    fipeExcedenteReais: 1.29,
    precoCreditoPremiumAvulso: "R$ 39,90",
    extrasRiscoLabel: "Créditos extras de blindagem: R$ 39,90 cada.",
    tagline: "Volume típico de pátio com proteção de margem.",
    destaque: true,
  },
  {
    slug: "premium",
    nome: "PREMIUM",
    preco: "R$ 189,90",
    periodo: "/mês",
    fipeMes: 60,
    creditosRisco: 3,
    creditosDetalhe: null as string | null,
    fipeExcedenteReais: 0.99,
    precoCreditoPremiumAvulso: "R$ 39,90",
    extrasRiscoLabel: "Créditos extras de blindagem: R$ 39,90 cada.",
    tagline: "Alto giro: mais consultas e créditos para o time.",
    destaque: false,
  },
] as const;

/** Preço unitário do crédito avulso (R$), para auditoria / billing futuro. */
export const PRECO_CREDITO_PREMIUM_AVULSO_REAIS = 39.9;

/** Compat: links antigos `?plano=basico` → STARTER */
const SLUG_ALIASES: Record<string, (typeof PLANOS_LANDING)[number]["slug"]> = {
  basico: "starter",
};

/**
 * Preço unitário (R$) de uma consulta FIPE após esgotar a cota mensal do plano.
 * Cálculo só no servidor; `plano` é o slug persistido em `usuario_acesso.plano`.
 * Alinhado a `normalizarSlugPlanoAuth` (provision OAuth).
 */
export function calcularPrecoExcedente(plano: string | null | undefined): number {
  const s = (plano ?? "").toLowerCase().trim();
  let slug: (typeof PLANOS_LANDING)[number]["slug"];
  if (s === "pro") slug = "pro";
  else if (s === "premium") slug = "premium";
  else if (s === "basico" || s === "starter" || s === "") slug = "starter";
  else {
    const found = PLANOS_LANDING.find((p) => p.slug === s);
    slug = found ? found.slug : "starter";
  }
  const p = PLANOS_LANDING.find((x) => x.slug === slug);
  return p!.fipeExcedenteReais;
}

/** Limites do bundle mensal (FIPE + créditos incluídos no plano). */
export function limitesPlanoPorSlug(
  slug: (typeof PLANOS_LANDING)[number]["slug"]
): { consultasFipeLimite: number; creditosPremium: number } {
  const p = PLANOS_LANDING.find((x) => x.slug === slug);
  if (!p) return { consultasFipeLimite: 10, creditosPremium: 0 };
  return {
    consultasFipeLimite: p.fipeMes,
    creditosPremium: p.creditosRisco,
  };
}

export function labelPlanoFromSlug(
  slug: string | null | undefined
): string | null {
  if (!slug) return null;
  const raw = slug.toLowerCase().trim();
  const resolved = SLUG_ALIASES[raw] ?? raw;
  const p = PLANOS_LANDING.find((x) => x.slug === resolved);
  return p ? p.nome : null;
}
