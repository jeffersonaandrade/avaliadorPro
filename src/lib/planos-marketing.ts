/** Slugs em `?plano=` na landing e cadastro (Supabase Auth / billing depois). */
export const PLANOS_LANDING = [
  {
    slug: "starter",
    nome: "STARTER",
    preco: "R$ 29,90",
    periodo: "/mês",
    fipeMes: 20,
    creditosRisco: 0,
    /** Texto abaixo da linha de créditos (opcional). */
    creditosDetalhe: null as string | null,
    /** Preço de risco avulso / extras (alta margem). */
    extrasRiscoLabel:
      "Consultas de risco avulsas: R$ 24,90.",
    tagline: "Ideal para quem avalia poucos carros.",
    destaque: false,
  },
  {
    slug: "pro",
    nome: "PRO",
    preco: "R$ 79,90",
    periodo: "/mês",
    fipeMes: 150,
    creditosRisco: 3,
    creditosDetalhe: "Bônus de R$ 59,70.",
    extrasRiscoLabel: "Consultas de risco extras: R$ 19,90.",
    tagline: "Volume típico de pátio com proteção de margem.",
    destaque: true,
  },
  {
    slug: "premium",
    nome: "PREMIUM",
    preco: "R$ 149,90",
    periodo: "/mês",
    fipeMes: 300,
    creditosRisco: 10,
    creditosDetalhe: "Plano se paga sozinho.",
    extrasRiscoLabel: "Consultas de risco extras: R$ 14,90.",
    tagline: "Alto giro: mais FIPE e créditos para o time.",
    destaque: false,
  },
] as const;

/** Compat: links antigos `?plano=basico` → STARTER */
const SLUG_ALIASES: Record<string, (typeof PLANOS_LANDING)[number]["slug"]> = {
  basico: "starter",
};

export function labelPlanoFromSlug(
  slug: string | null | undefined
): string | null {
  if (!slug) return null;
  const raw = slug.toLowerCase().trim();
  const resolved = SLUG_ALIASES[raw] ?? raw;
  const p = PLANOS_LANDING.find((x) => x.slug === resolved);
  return p ? p.nome : null;
}
