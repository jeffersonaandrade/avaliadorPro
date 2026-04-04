import { z } from "zod";

import { FETCH_TIMEOUT_MS_EXTERNAL } from "@/lib/fetch-timeout-ms";

const consultarPlacaOkSchema = z.object({
  status: z.literal("ok"),
  mensagem: z.string().optional(),
  dados: z.object({
    informacoes_veiculo: z.object({
      dados_veiculo: z.object({
        placa: z.string().optional(),
        chassi: z.string().optional(),
        ano_fabricacao: z.union([z.string(), z.number()]).optional(),
        ano_modelo: z.union([z.string(), z.number()]),
        marca: z.string(),
        modelo: z.string(),
        cor: z.string().optional(),
        combustivel: z.string().optional(),
        segmento: z.string().optional(),
        municipio: z.string().optional(),
        uf_municipio: z.string().optional(),
      }),
      dados_tecnicos: z
        .object({
          tipo_veiculo: z.string().optional(),
          sub_segmento: z.string().optional(),
        })
        .optional(),
    }),
  }),
});

const consultarPlacaErroSchema = z.object({
  status: z.literal("erro"),
  mensagem: z.string().optional(),
});

export type DadosBasicosVeiculo = {
  placa: string;
  chassi: string;
  cor: string;
  combustivel: string;
  marca: string;
  modelo: string;
  anoModelo: number;
  tipoVeiculo: string;
  raw: z.infer<typeof consultarPlacaOkSchema>;
};

function getConsultarPlacaAuthHeader(): string {
  const email = process.env.CONSULTAR_PLACA_API_EMAIL?.trim();
  const apiKey = process.env.CONSULTAR_PLACA_API_KEY?.trim();
  if (!email || !apiKey) {
    throw new Error(
      "Defina CONSULTAR_PLACA_API_EMAIL e CONSULTAR_PLACA_API_KEY no servidor."
    );
  }
  const token = Buffer.from(`${email}:${apiKey}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

const CONSULTAR_PLACA_URL =
  "https://api.consultarplaca.com.br/v2/consultarPlaca";

/**
 * Informações básicas (Consultar Placa). Consome crédito da conta.
 * Falhas de rede/API não devem debitar crédito no fluxo de negócio (tratar antes de persistir).
 * Timeout alinhado a `FETCH_TIMEOUT_MS_EXTERNAL` (limite Netlify Free).
 */
export async function consultarInformacoesBasicas(
  placa: string
): Promise<DadosBasicosVeiculo> {
  const url = new URL(CONSULTAR_PLACA_URL);
  url.searchParams.set("placa", placa);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS_EXTERNAL);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: getConsultarPlacaAuthHeader(),
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (e) {
    clearTimeout(t);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[consultar-placa] fetch", { placa, msg });
    throw new Error(
      "Falha ao consultar a placa (rede ou timeout). Tente novamente."
    );
  } finally {
    clearTimeout(t);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("Resposta inválida da API Consultar Placa.");
  }

  const erroParsed = consultarPlacaErroSchema.safeParse(json);
  if (erroParsed.success) {
    console.error("[consultar-placa] erro API", {
      placa,
      mensagem: erroParsed.data.mensagem,
    });
    throw new Error(
      erroParsed.data.mensagem ??
        "Consultar Placa retornou erro. Verifique saldo e parâmetros."
    );
  }

  if (!res.ok) {
    console.error("[consultar-placa] HTTP", { placa, status: res.status });
    throw new Error(`Consultar Placa indisponível (HTTP ${res.status}).`);
  }

  const okParsed = consultarPlacaOkSchema.safeParse(json);
  if (!okParsed.success) {
    console.error("[consultar-placa] JSON inesperado", okParsed.error.flatten());
    throw new Error("Formato de dados da placa não reconhecido.");
  }

  const d = okParsed.data.dados.informacoes_veiculo;
  const v = d.dados_veiculo;
  const anoRaw = v.ano_modelo;
  const anoModelo =
    typeof anoRaw === "number" ? anoRaw : parseInt(String(anoRaw), 10);
  if (!Number.isFinite(anoModelo) || anoModelo < 1950 || anoModelo > 2100) {
    throw new Error("Ano modelo inválido retornado pela consulta.");
  }

  return {
    placa: v.placa ?? placa,
    chassi: v.chassi?.trim() ?? "—",
    cor: v.cor?.trim() ?? "—",
    combustivel: v.combustivel?.trim() ?? "—",
    marca: v.marca.trim(),
    modelo: v.modelo.trim(),
    anoModelo,
    tipoVeiculo:
      d.dados_tecnicos?.tipo_veiculo?.trim() ||
      v.segmento?.trim() ||
      "Automovel",
    raw: okParsed.data,
  };
}
