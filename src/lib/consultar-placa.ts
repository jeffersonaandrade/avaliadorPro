import { z } from "zod";

import { FETCH_TIMEOUT_MS_EXTERNAL } from "@/lib/fetch-timeout-ms";
import { resolverPlacaParaRequisicaoConsultarPlacaApi } from "@/lib/placa-teste-demo";
import { selecionarMelhorFipe } from "@/lib/selecionar-fipe";

const consultarPlacaOkSchema = z.object({
  status: z.literal("ok"),
  mensagem: z.string().optional(),
  dados: z.object({
    informacoes_veiculo: z.object({
      dados_veiculo: z.object({
        placa: z.string().optional(),
        chassi: z.string().optional(),
        ano_fabricacao: z.union([z.string(), z.number()]).optional(),
        /** API pode retornar typo `ano_frabricacao`; manter fallback compatível. */
        ano_frabricacao: z.union([z.string(), z.number()]).optional(),
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

const consultarPrecoFipeOkSchema = z.object({
  status: z.literal("ok"),
  mensagem: z.string().optional(),
  dados: z.object({
    informacoes_fipe: z
      .array(
        z.object({
          codigo_fipe: z.string().optional(),
          modelo_versao: z.string().optional(),
          preco: z.union([z.string(), z.number()]).optional(),
          mes_referencia: z.string().optional(),
          historico: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
        })
      )
      .optional(),
  }),
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

export type PrecoFipePorPlaca = {
  valor: string;
  mesReferencia: string | null;
  modeloFipeNome: string;
  combustivelFipe: string;
  codigoFipe: string | null;
  historico12Meses: Record<string, string>;
  avisoFipe?: string;
};

/** Basic `email:apiKey` — usado em `/v2/consultarPlaca` e nas rotas premium v2 quando não há Bearer. */
export function getConsultarPlacaAuthHeader(): string {
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
const CONSULTAR_PRECO_FIPE_URL =
  "https://api.consultarplaca.com.br/v2/consultarPrecoFipe";

function formatarReaisParaBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/**
 * Informações básicas (Consultar Placa). Consome crédito da conta.
 * Falhas de rede/API não devem debitar crédito no fluxo de negócio (tratar antes de persistir).
 * Timeout alinhado a `FETCH_TIMEOUT_MS_EXTERNAL` (limite Netlify Free).
 */
export async function consultarInformacoesBasicas(
  placa: string
): Promise<DadosBasicosVeiculo> {
  const placaParaAPI = resolverPlacaParaRequisicaoConsultarPlacaApi(placa);
  if (placaParaAPI !== placa) {
    console.info(
      `[MOCK_ACTIVE] Chamada realizada com placa substituta: ${placaParaAPI}`
    );
  }

  const url = new URL(CONSULTAR_PLACA_URL);
  url.searchParams.set("placa", placaParaAPI);

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
    placa,
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

/**
 * Consulta referência FIPE por placa no endpoint v2 da Consultar Placa.
 * Retorna a primeira versão disponível em `informacoes_fipe`.
 */
export async function consultarPrecoFipePorPlaca(
  placa: string,
  contexto: { modeloVeiculo: string; anoModelo: number }
): Promise<PrecoFipePorPlaca | null> {
  const placaParaAPI = resolverPlacaParaRequisicaoConsultarPlacaApi(placa);
  const url = new URL(CONSULTAR_PRECO_FIPE_URL);
  url.searchParams.set("placa", placaParaAPI);

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
    console.error("[consultar-preco-fipe] fetch", { placa, msg });
    throw new Error("Falha ao consultar a FIPE na Consultar Placa.");
  } finally {
    clearTimeout(t);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("Resposta inválida ao consultar preço FIPE.");
  }

  const erroParsed = consultarPlacaErroSchema.safeParse(json);
  if (erroParsed.success) {
    throw new Error(
      erroParsed.data.mensagem ?? "Consultar Placa retornou erro na FIPE."
    );
  }

  if (!res.ok) {
    throw new Error(`Consultar Placa FIPE indisponível (HTTP ${res.status}).`);
  }

  const okParsed = consultarPrecoFipeOkSchema.safeParse(json);
  if (!okParsed.success) {
    console.error(
      "[consultar-preco-fipe] JSON inesperado",
      okParsed.error.flatten()
    );
    throw new Error("Formato de dados FIPE não reconhecido.");
  }

  const lista = okParsed.data.dados.informacoes_fipe ?? [];
  const escolha = selecionarMelhorFipe({
    modeloVeiculo: contexto.modeloVeiculo,
    anoModelo: contexto.anoModelo,
    informacoesFipe: lista,
  });
  const item = escolha.item;
  if (!item) return null;

  const precoNumero =
    typeof item.preco === "number" ? item.preco : Number(item.preco ?? NaN);
  if (!Number.isFinite(precoNumero) || precoNumero <= 0) return null;

  const historicoRaw = item.historico ?? {};
  const historico12Meses: Record<string, string> = {};
  for (const [mes, valor] of Object.entries(historicoRaw)) {
    const n = typeof valor === "number" ? valor : Number(valor);
    if (!Number.isFinite(n) || n <= 0) continue;
    historico12Meses[mes] = formatarReaisParaBRL(n);
  }

  return {
    valor: formatarReaisParaBRL(precoNumero),
    mesReferencia: item.mes_referencia ?? null,
    modeloFipeNome: item.modelo_versao?.trim() || "—",
    combustivelFipe: "—",
    codigoFipe: item.codigo_fipe?.trim() || null,
    historico12Meses,
    ...(escolha.avisoFipe ? { avisoFipe: escolha.avisoFipe } : {}),
  };
}
