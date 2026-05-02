/**
 * Imagens remotas (remarketing / IA) da API Consultar Placa podem estourar timeout
 * em ambientes com limite curto (ex.: Netlify 10s) ou ao renderizar mídia pesada na UI.
 * O texto do dossiê continua disponível.
 */
export function omitirCarregarImagensConsultaPremium(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_OMIT_PREMIUM_IMAGES === "1") return true;
  const h = window.location.hostname;
  return /\.netlify\.app$/i.test(h);
}
