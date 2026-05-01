import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://avaliadorpro.com.br";
  const now = new Date();
  const routes = [
    "/",
    "/painel",
    "/vale-a-pena-comprar-carro-de-leilao",
    "/calculadora-preco-carro",
    "/carro-sinistrado-vale-a-pena",
    "/quanto-pagar-carro-usado",
    "/carro-recuperado-compensa",
    "/como-comprar-carro-para-revenda",
    "/erro-ao-comprar-carro-usado",
    "/consulta-historico-veiculo",
    "/verificar-carro-por-placa",
    "/descobrir-se-carro-e-de-leilao",
    "/consulta-completa-veiculo",
    "/calcular-lucro-revenda-carro",
  ];
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.8,
  }));
}

