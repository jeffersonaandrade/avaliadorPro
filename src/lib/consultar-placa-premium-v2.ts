import "server-only";

import {
  constatadoTriStateConsultaPlaca,
  type TipoConsultaRiscoPremium,
} from "@/lib/consultas-risco-premium";
import { parsearRenainfDossie } from "@/lib/api-v2/parsers";
import {
  FETCH_TIMEOUT_MS_EXTERNAL,
  FETCH_TIMEOUT_MS_LEILAO_PRIME,
  FETCH_TIMEOUT_MS_RENAINF,
} from "@/lib/fetch-timeout-ms";
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

export function obterTokenBearerConsultarPlacaV2(): string {
  const t = process.env.API_CONSULTAR_PLACA_TOKEN?.trim();
  if (!t) {
    throw new Error(
      "Defina API_CONSULTAR_PLACA_TOKEN no servidor (Bearer Consultar Placa v2)."
    );
  }
  return t;
}

export function cachePremiumConsultaFresco(consultadoEmIso: string): boolean {
  const t = Date.parse(consultadoEmIso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < TTL_PREMIUM_DIAS * MS_POR_DIA;
}

type JsonRecord = Record<string, unknown>;

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
      const constatado = constatadoTriStateConsultaPlaca(inf?.possui_registro);
      const cls = (inf?.registro_sobre_oferta as JsonRecord | undefined)
        ?.classificacao;
      const extra =
        typeof cls === "string" && cls.trim() ? ` Classificação: ${cls}.` : "";
      return {
        constatado,
        resumo: constatado
          ? `Leilão: consta registro de oferta.${extra} ${msgBase}`.trim()
          : `Leilão: sem registro de oferta. ${msgBase}`.trim(),
      };
    }
    case "sinistro": {
      const r = dados.registro_sinistro_com_perda_total as JsonRecord;
      const constatado = constatadoTriStateConsultaPlaca(r?.possui_registro);
      const reg = typeof r?.registro === "string" ? r.registro.trim() : "";
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
      const constatado = constatadoTriStateConsultaPlaca(g?.possui_gravame);
      const reg = g?.registro as JsonRecord | null | undefined;
      const sit =
        reg && typeof reg.situacao === "string" ? reg.situacao.trim() : "";
      return {
        constatado,
        resumo: constatado
          ? `Gravame: ${sit || "consta registro."} ${msgBase}`.trim()
          : `Gravame: sem registro ativo. ${msgBase}`.trim(),
      };
    }
    case "renainf": {
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

/**
 * GET com Bearer, timeout `FETCH_TIMEOUT_MS_EXTERNAL` e 1 retry em rede (500ms).
 */
export async function fetchConsultarPlacaPremiumV2(
  tipo: TipoConsultaRiscoPremium,
  placa: string
): Promise<ResultadoFetchPremiumV2> {
  const timeoutMs =
    tipo === "leilao"
      ? FETCH_TIMEOUT_MS_LEILAO_PRIME
      : tipo === "renainf"
        ? FETCH_TIMEOUT_MS_RENAINF
        : FETCH_TIMEOUT_MS_EXTERNAL;
  let token: string;
  try {
    token = obterTokenBearerConsultarPlacaV2();
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { ok: false, tipoErro: "config", mensagem: m };
  }

  const path = PATHS_PREMIUM_V2[tipo];
  const url = new URL(path, BASE);
  url.searchParams.set("placa", placa);

  const tentar = async (): Promise<ResultadoFetchPremiumV2> => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
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

export function isSandboxMocksPremiumEnabled(): boolean {
  return (
    String(process.env.NEXT_PUBLIC_USE_MOCKS ?? "")
      .trim()
      .toLowerCase() === "true"
  );
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
