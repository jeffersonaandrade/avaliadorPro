import "server-only";

import {
  constatadoTriStateConsultaPlaca,
  triPossuiRegistroConsultaPlaca,
  type TipoConsultaRiscoPremium,
} from "@/lib/consultas-risco-premium";
import { parsearRenainfDossie } from "@/lib/api-v2/parsers";
import {
  FETCH_TIMEOUT_MS_EXTERNAL,
  FETCH_TIMEOUT_MS_LEILAO_PRIME,
  FETCH_TIMEOUT_MS_RENAINF,
} from "@/lib/fetch-timeout-ms";
import { getConsultarPlacaAuthHeader } from "@/lib/consultar-placa";
import { envNextPublicUseMocksAtivo } from "@/lib/demo-mocks";
import { resolverPlacaParaRequisicaoConsultarPlacaApi } from "@/lib/placa-teste-demo";
import { formatarMoedaBRL } from "@/lib/viabilidade";

const BASE = "https://api.consultarplaca.com.br";

export const TTL_PREMIUM_DIAS = 7;
const MS_POR_DIA = 86_400_000;
const RETRY_DELAY_MS = 500;

export const PATHS_PREMIUM_V2: Record<TipoConsultaRiscoPremium, string> = {
  leilao: "/v2/consultarRegistroLeilaoPrime",
  sinistro: "/v2/consultarSinistroComPerdaTotal",
  roubo_furto: "/v2/consultarHistoricoRouboFurto",
  gravame: "/v2/consultarGravame",
  renainf: "/v2/consultarRegistrosInfracoesRenainf",
};

/**
 * Cabeçalho `Authorization` para GET nas rotas premium v2.
 * **Bearer** (`API_CONSULTAR_PLACA_TOKEN`) tem precedência; senão **Basic** com
 * `CONSULTAR_PLACA_API_EMAIL` + `CONSULTAR_PLACA_API_KEY` (mesmo contrato do `/v2/consultarPlaca`).
 */
export function obterCabecalhoAuthorizationConsultarPlacaPremium(): string {
  const bearer = process.env.API_CONSULTAR_PLACA_TOKEN?.trim();
  if (bearer) return `Bearer ${bearer}`;
  return getConsultarPlacaAuthHeader();
}

export function cachePremiumConsultaFresco(consultadoEmIso: string): boolean {
  const t = Date.parse(consultadoEmIso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < TTL_PREMIUM_DIAS * MS_POR_DIA;
}

type JsonRecord = Record<string, unknown>;

function recRenainf(v: unknown): JsonRecord | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as JsonRecord;
}

export function corpoRespostaMinimoValido(
  raw: unknown
): raw is JsonRecord & { status: string; dados: unknown } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as JsonRecord;
  return o.status === "ok" && "dados" in o && typeof o.dados === "object" && o.dados !== null;
}

/** Estrutura mínima por tipo (documentação Consultar Placa v2). */
export function estruturaMinimaPorTipo(
  tipo: TipoConsultaRiscoPremium,
  dados: JsonRecord
): boolean {
  switch (tipo) {
    case "leilao":
      return (
        typeof dados.informacoes_sobre_leilao === "object" &&
        dados.informacoes_sobre_leilao !== null
      );
    case "sinistro":
      return (
        typeof dados.registro_sinistro_com_perda_total === "object" &&
        dados.registro_sinistro_com_perda_total !== null
      );
    case "roubo_furto": {
      const h = dados.historico_roubo_furto;
      if (!h || typeof h !== "object" || Array.isArray(h)) return false;
      const rf = (h as JsonRecord).registros_roubo_furto;
      return typeof rf === "object" && rf !== null && !Array.isArray(rf);
    }
    case "gravame":
      return typeof dados.gravame === "object" && dados.gravame !== null;
    case "renainf":
      return dados !== null && typeof dados === "object" && !Array.isArray(dados);
    default:
      return false;
  }
}

export function normalizarConsultaPremiumV2(
  tipo: TipoConsultaRiscoPremium,
  body: JsonRecord & { status: "ok"; dados: JsonRecord; mensagem?: string }
): { constatado: boolean; resumo: string } {
  const dados = body.dados;
  const msgBase =
    typeof body.mensagem === "string" && body.mensagem.trim()
      ? body.mensagem.trim()
      : "Consulta realizada com sucesso.";

  switch (tipo) {
    case "leilao": {
      const inf = dados.informacoes_sobre_leilao as JsonRecord;
      const tri = triPossuiRegistroConsultaPlaca(inf?.possui_registro);
      const constatado = tri === "sim";
      const cls = (inf?.registro_sobre_oferta as JsonRecord | undefined)
        ?.classificacao;
      const extra =
        typeof cls === "string" && cls.trim() ? ` Classificação: ${cls}.` : "";
      if (tri === "indisponivel") {
        return {
          constatado: false,
          resumo: `Leilão: resultado indisponível na fonte. ${msgBase}`.trim(),
        };
      }
      return {
        constatado,
        resumo: constatado
          ? `Leilão: consta registro de oferta.${extra} ${msgBase}`.trim()
          : `Leilão: sem registro de oferta. ${msgBase}`.trim(),
      };
    }
    case "sinistro": {
      const r = dados.registro_sinistro_com_perda_total as JsonRecord;
      const tri = triPossuiRegistroConsultaPlaca(r?.possui_registro);
      const constatado = tri === "sim";
      const reg = typeof r?.registro === "string" ? r.registro.trim() : "";
      if (tri === "indisponivel") {
        return {
          constatado: false,
          resumo: `Sinistro (perda total): resultado indisponível na fonte. ${msgBase}`.trim(),
        };
      }
      return {
        constatado,
        resumo: constatado
          ? `Sinistro (perda total): ${reg || "consta registro."} ${msgBase}`.trim()
          : `Sinistro (perda total): sem registro. ${msgBase}`.trim(),
      };
    }
    case "roubo_furto": {
      const h = dados.historico_roubo_furto as JsonRecord;
      const rf = h?.registros_roubo_furto as JsonRecord;
      const constatado = constatadoTriStateConsultaPlaca(rf?.possui_registro);
      const regs = rf?.registros;
      const n = Array.isArray(regs) ? regs.length : 0;
      return {
        constatado,
        resumo: constatado
          ? `Roubo/furto: ${n} registro(s) na base. ${msgBase}`.trim()
          : `Roubo/furto: sem registro. ${msgBase}`.trim(),
      };
    }
    case "gravame": {
      const g = dados.gravame as JsonRecord;
      const tri = triPossuiRegistroConsultaPlaca(g?.possui_gravame);
      const constatado = tri === "sim";
      const reg = g?.registro as JsonRecord | null | undefined;
      const sit =
        reg && typeof reg.situacao === "string" ? reg.situacao.trim() : "";
      if (tri === "indisponivel") {
        return {
          constatado: false,
          resumo: `Gravame: resultado indisponível na fonte. ${msgBase}`.trim(),
        };
      }
      return {
        constatado,
        resumo: constatado
          ? `Gravame: ${sit || "consta registro."} ${msgBase}`.trim()
          : `Gravame: sem registro ativo. ${msgBase}`.trim(),
      };
    }
    case "renainf": {
      const regDeb = recRenainf(
        dados.registro_debitos_por_infracoes_renainf ??
          dados.registroDebitosPorInfracoesRenainf
      );
      const infracoesRen = recRenainf(
        regDeb?.infracoes_renainf ?? regDeb?.infracoesRenainf
      );
      const triRen = triPossuiRegistroConsultaPlaca(
        infracoesRen?.possui_infracoes ?? infracoesRen?.possuiInfracoes
      );
      if (triRen === "indisponivel") {
        return {
          constatado: false,
          resumo: `Renainf: resultado indisponível na fonte. ${msgBase}`.trim(),
        };
      }
      const r = parsearRenainfDossie(dados);
      const constatado = r.infracoes.length > 0;
      const totalFmt = formatarMoedaBRL(r.valor_total_reais);
      return {
        constatado,
        resumo: constatado
          ? `Renainf: ${r.infracoes.length} infração(ões). Total estimado: ${totalFmt}. ${msgBase}`.trim()
          : `Renainf: sem infrações registradas. ${msgBase}`.trim(),
      };
    }
    default:
      return { constatado: false, resumo: msgBase };
  }
}

function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

function isErroRede(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  if (e instanceof Error) {
    const m = e.message.toLowerCase();
    return (
      m.includes("fetch") ||
      m.includes("network") ||
      m.includes("econnreset") ||
      m.includes("socket")
    );
  }
  return false;
}

export type ResultadoFetchPremiumV2 =
  | { ok: true; json: JsonRecord }
  | { ok: false; tipoErro: "timeout" | "rede" | "http" | "json" | "config"; mensagem: string };

/** @deprecated Use `resolverPlacaParaRequisicaoConsultarPlacaApi` (mesma regra). */
export function resolverPlacaParametroConsultaPremiumV2(
  placaAnaliseNormalizada: string
): string {
  return resolverPlacaParaRequisicaoConsultarPlacaApi(placaAnaliseNormalizada);
}

/**
 * GET com Bearer ou Basic, timeout conforme rota e 1 retry em rede (500ms).
 */
export async function fetchConsultarPlacaPremiumV2(
  tipo: TipoConsultaRiscoPremium,
  placa: string
): Promise<ResultadoFetchPremiumV2> {
  const placaParaAPI = resolverPlacaParaRequisicaoConsultarPlacaApi(placa);
  if (placaParaAPI !== placa) {
    console.info(
      `[MOCK_ACTIVE] Chamada realizada com placa substituta: ${placaParaAPI} (tipo=${tipo}, placa_analise=${placa})`
    );
  }

  const timeoutMs =
    tipo === "leilao"
      ? FETCH_TIMEOUT_MS_LEILAO_PRIME
      : tipo === "renainf"
        ? FETCH_TIMEOUT_MS_RENAINF
        : FETCH_TIMEOUT_MS_EXTERNAL;
  let authorization: string;
  try {
    authorization = obterCabecalhoAuthorizationConsultarPlacaPremium();
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { ok: false, tipoErro: "config", mensagem: m };
  }

  const path = PATHS_PREMIUM_V2[tipo];
  const url = new URL(path, BASE);
  url.searchParams.set("placa", placaParaAPI);

  const tentar = async (): Promise<ResultadoFetchPremiumV2> => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: authorization,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      const text = await res.text();
      let json: unknown;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        return {
          ok: false,
          tipoErro: "json",
          mensagem: "Resposta inválida da API (não é JSON).",
        };
      }
      const o = json as JsonRecord;
      if (!res.ok) {
        const msg =
          typeof o.mensagem === "string"
            ? o.mensagem
            : `HTTP ${res.status}`;
        return { ok: false, tipoErro: "http", mensagem: msg };
      }
      if (o.status === "erro") {
        const msg =
          typeof o.mensagem === "string"
            ? o.mensagem
            : "Consulta retornou status erro.";
        return { ok: false, tipoErro: "http", mensagem: msg };
      }
      return { ok: true, json: o };
    } catch (e) {
      if (isAbortError(e)) {
        return {
          ok: false,
          tipoErro: "timeout",
          mensagem: "Tempo limite da consulta excedido. Tente novamente.",
        };
      }
      if (isErroRede(e)) {
        return {
          ok: false,
          tipoErro: "rede",
          mensagem: e instanceof Error ? e.message : "Falha de rede.",
        };
      }
      return {
        ok: false,
        tipoErro: "rede",
        mensagem: e instanceof Error ? e.message : String(e),
      };
    } finally {
      clearTimeout(tid);
    }
  };

  let r = await tentar();
  if (r.ok) return r;
  if (r.tipoErro === "rede") {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    r = await tentar();
  }
  return r;
}

const inflightPremium = new Map<string, Promise<unknown>>();

export function withPremiumConsultaDedupe<T>(
  placaNorm: string,
  tipo: TipoConsultaRiscoPremium,
  clienteId: string,
  fn: () => Promise<T>
): Promise<T> {
  const cid = (clienteId ?? "").trim() || "anon";
  const key = `${placaNorm}|${tipo}|${cid}`;
  const existente = inflightPremium.get(key);
  if (existente) return existente as Promise<T>;
  const p = fn().finally(() => {
    inflightPremium.delete(key);
  });
  inflightPremium.set(key, p);
  return p;
}

const inflightBlindagem = new Map<string, Promise<unknown>>();

export function withBlindagemCompletaDedupe<T>(
  placaNorm: string,
  clienteId: string,
  fn: () => Promise<T>
): Promise<T> {
  const cid = (clienteId ?? "").trim() || "anon";
  const key = `${placaNorm}|blindagem_completa|${cid}`;
  const existente = inflightBlindagem.get(key);
  if (existente) return existente as Promise<T>;
  const p = fn().finally(() => {
    inflightBlindagem.delete(key);
  });
  inflightBlindagem.set(key, p);
  return p;
}

/** Bearer ou o par email+key (Basic) — o mesmo contrato de `obterCabecalhoAuthorizationConsultarPlacaPremium`. */
function temAutenticacaoConsultarPlacaPremiumNoEnv(): boolean {
  const token = String(process.env.API_CONSULTAR_PLACA_TOKEN ?? "").trim();
  if (token.length > 0) return true;
  const email = String(process.env.CONSULTAR_PLACA_API_EMAIL ?? "").trim();
  const key = String(process.env.CONSULTAR_PLACA_API_KEY ?? "").trim();
  return email.length > 0 && key.length > 0;
}

/**
 * Mock só para consultas premium quando **não** há credencial real no servidor.
 * Com `API_CONSULTAR_PLACA_TOKEN` **ou** `CONSULTAR_PLACA_API_EMAIL` + `CONSULTAR_PLACA_API_KEY`,
 * premium chama a v2 (Basic ou Bearer), inclusive com `NEXT_PUBLIC_USE_MOCKS=true`.
 */
export function isSandboxMocksPremiumEnabled(): boolean {
  if (temAutenticacaoConsultarPlacaPremiumNoEnv()) return false;
  return envNextPublicUseMocksAtivo();
}

export function mockConsultarRiscoApiDeterministico(
  placa: string,
  tipo: TipoConsultaRiscoPremium
): { constatado: boolean; resumo: string } {
  let hash = 0;
  for (let i = 0; i < placa.length; i++) {
    hash = (hash + placa.charCodeAt(i) * (i + 3)) % 1009;
  }
  const tipoOrd =
    (
      ["leilao", "sinistro", "roubo_furto", "gravame", "renainf"] as const
    ).indexOf(tipo);
  const constatado = (hash + tipoOrd * 17) % 5 !== 0;
  const nomes: Record<TipoConsultaRiscoPremium, string> = {
    leilao: "Leilão",
    sinistro: "Sinistro",
    roubo_furto: "Roubo/furto",
    gravame: "Gravame",
    renainf: "Renainf",
  };
  const resumo = constatado
    ? `${nomes[tipo]}: ocorrência indicada nas bases (simulação).`
    : `${nomes[tipo]}: sem ocorrência nas bases consultadas (simulação).`;
  return { constatado, resumo };
}
