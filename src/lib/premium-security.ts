import { isPublicDemoMocksMode } from "@/lib/demo-mocks";

const MS_MIN = 60_000;
const MS_HORA = 3_600_000;
const COOLDOWN_VOLUME_MS = 30 * 60 * 1000;
/** Bloqueio por padrão de enumeração de placas (auditoria). */
const BLOQUEIO_SEQUENCIA_MS = 60 * 60 * 1000;

const MAX_POR_MINUTO = 5;
/** Mais de 20 na hora → cooldown (a 21ª tentativa dispara). */
const MAX_POR_HORA_ANTES_COOLDOWN = 20;

type EstadoUsuario = {
  timestampsConsulta: number[];
  cooldownAte: number;
  /** Últimas placas consultadas (premium), ordem cronológica. */
  placasRecentes: string[];
  bloqueioAuditoriaAte: number;
};

const porUsuario = new Map<string, EstadoUsuario>();

function estado(id: string): EstadoUsuario {
  let e = porUsuario.get(id);
  if (!e) {
    e = {
      timestampsConsulta: [],
      cooldownAte: 0,
      placasRecentes: [],
      bloqueioAuditoriaAte: 0,
    };
    porUsuario.set(id, e);
  }
  return e;
}

function podarTimestamps(ts: number[], agora: number, janelaMs: number): number[] {
  const limite = agora - janelaMs;
  return ts.filter((t) => t > limite);
}

/**
 * Extrai prefixo (3 letras) e sufixo numérico de placas no padrão antigo AAA9999.
 * Mercosul e outros formatos retornam null (não entram na heurística de sequência).
 */
export function parsePlacaPadraoAntigoSequencia(
  placaNorm: string
): { prefixo: string; numero: number } | null {
  const p = placaNorm.replace(/-/g, "").toUpperCase();
  const m = /^([A-Z]{3})(\d{4})$/.exec(p);
  if (!m) return null;
  const n = parseInt(m[2], 10);
  if (!Number.isFinite(n)) return null;
  return { prefixo: m[1], numero: n };
}

export function tresPlacasSaoSequenciaisEnum(
  a: string,
  b: string,
  c: string
): boolean {
  const pa = parsePlacaPadraoAntigoSequencia(a);
  const pb = parsePlacaPadraoAntigoSequencia(b);
  const pc = parsePlacaPadraoAntigoSequencia(c);
  if (!pa || !pb || !pc) return false;
  if (pa.prefixo !== pb.prefixo || pb.prefixo !== pc.prefixo) return false;
  return pb.numero === pa.numero + 1 && pc.numero === pb.numero + 1;
}

export type ResultadoSegurancaPremium =
  | { ok: true }
  | { ok: false; motivo: string; codigo: "rate" | "cooldown" | "enumeracao" };

/**
 * Antes de cada chamada HTTP premium (não-cache). Registra tentativa e aplica limites.
 */
export function registrarTentativaConsultaPremium(
  usuarioId: string,
  placaNorm: string,
  agora: number = Date.now()
): ResultadoSegurancaPremium {
  if (isPublicDemoMocksMode()) return { ok: true };

  const id = usuarioId.trim();
  if (!id) return { ok: true };

  const e = estado(id);

  if (agora < e.bloqueioAuditoriaAte) {
    return {
      ok: false,
      motivo:
        "Padrão de consultas suspeito detectado. Acesso temporariamente suspenso para auditoria.",
      codigo: "enumeracao",
    };
  }

  if (agora < e.cooldownAte) {
    return {
      ok: false,
      motivo:
        "Volume elevado de consultas premium. Aguarde o fim do período de cooldown.",
      codigo: "cooldown",
    };
  }

  const ultimas = [...e.placasRecentes, placaNorm].slice(-3);
  if (
    ultimas.length === 3 &&
    tresPlacasSaoSequenciaisEnum(ultimas[0], ultimas[1], ultimas[2])
  ) {
    e.bloqueioAuditoriaAte = agora + BLOQUEIO_SEQUENCIA_MS;
    e.placasRecentes = [];
    return {
      ok: false,
      motivo:
        "Sequência de placas suspeita detectada. Acesso bloqueado temporariamente para auditoria.",
      codigo: "enumeracao",
    };
  }

  e.timestampsConsulta = podarTimestamps(e.timestampsConsulta, agora, MS_HORA);
  const naUltimaHora = e.timestampsConsulta.length;

  if (naUltimaHora >= MAX_POR_HORA_ANTES_COOLDOWN) {
    e.cooldownAte = agora + COOLDOWN_VOLUME_MS;
    e.timestampsConsulta = [];
    return {
      ok: false,
      motivo:
        "Limite horário de consultas premium excedido. Cooldown de 30 minutos aplicado.",
      codigo: "cooldown",
    };
  }

  const naUltimoMinuto = e.timestampsConsulta.filter(
    (t) => agora - t < MS_MIN
  ).length;
  if (naUltimoMinuto >= MAX_POR_MINUTO) {
    return {
      ok: false,
      motivo: "Limite de 5 consultas premium por minuto excedido.",
      codigo: "rate",
    };
  }

  e.timestampsConsulta.push(agora);

  e.placasRecentes.push(placaNorm);
  if (e.placasRecentes.length > 3) {
    e.placasRecentes = e.placasRecentes.slice(-3);
  }

  return { ok: true };
}

export function resetPremiumSecurityForTests(): void {
  porUsuario.clear();
}
