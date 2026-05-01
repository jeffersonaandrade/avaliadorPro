import { describe, expect, it } from "vitest";

import { linhasResumoDossiePremium } from "@/components/formulario-viabilidade/premium-dossie-resumo";

describe("linhasResumoDossiePremium — roubo_furto", () => {
  it("lista uma linha por registro (card premium)", () => {
    const item = {
      dossie: {
        kind: "roubo_furto",
        registros: [
          {
            boletim_ocorrencia: "9996",
            data_boletim_ocorrencia: "02/09/2019",
            tipo_ocorrencia: "Declaração de Roubo",
            uf_ocorrencia: "PR",
          },
          {
            boletim_ocorrencia: "9997",
            data_boletim_ocorrencia: "05/09/2019",
            tipo_ocorrencia: "Achado",
            uf_ocorrencia: "PR",
          },
        ],
      },
    };
    const linhas = linhasResumoDossiePremium("roubo_furto", item);
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toContain("Declaração de Roubo");
    expect(linhas[0]).toContain("9996");
    expect(linhas[1]).toContain("Achado");
  });
});
