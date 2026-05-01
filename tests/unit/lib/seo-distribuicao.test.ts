import { describe, expect, it } from "vitest";
import {
  gerarPostSocial,
  gerarPostsSociaisEmLote,
} from "@/lib/seo-distribuicao";

describe("gerarPostSocial", () => {
  it("gera versões para LinkedIn, Twitter e Reddit", () => {
    const posts = gerarPostSocial({
      titulo: "Carro sinistrado vale a pena?",
      url: "https://avaliadorpro.com.br/carro-sinistrado-vale-a-pena",
    });

    expect(posts.linkedin).toContain("Carro sinistrado vale a pena?");
    expect(posts.twitter).toContain("https://avaliadorpro.com.br");
    expect(posts.reddit).toContain("roleta russa");
  });
});

describe("gerarPostsSociaisEmLote", () => {
  it("gera ate 10 posts automaticamente", () => {
    const itens = Array.from({ length: 12 }).map((_, i) => ({
      titulo: `Post ${i + 1}`,
      url: `https://avaliadorpro.com.br/p${i + 1}`,
    }));
    const posts = gerarPostsSociaisEmLote(itens);
    expect(posts).toHaveLength(10);
    expect(posts[0].linkedin).toContain("Post 1");
  });
});

