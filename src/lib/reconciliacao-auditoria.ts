export type LinhaEventoAuditoriaDb = {
  id: string;
  criado_em: string;
  cliente_id: string;
  placa: string;
  evento: string;
  tipo_consulta: string | null;
  detalhe: string | null;
  valor_evitar_perda: number | null;
  tipo_risco_detectado: string | null;
  request_id: string | null;
  persistencia_falhou_apos_debito?: boolean | null;
  blindagem_persistencia_falhou_apos_debito?: boolean | null;
};

/** Substrings em `detalhe` que marcam `CREDITO_CONSUMIDO` como ROI suspeito (legado / explícito). */
export const MARKERS_DETALHE_ROI_SUSPEITO = [
  "persistencia_falhou_apos_debito",
  "blindagem_persistencia_falhou_apos_debito",
] as const;

export type LinhaCreditoRoiFlags = {
  detalhe: string | null;
  persistencia_falhou_apos_debito?: boolean | null;
  blindagem_persistencia_falhou_apos_debito?: boolean | null;
};

/**
 * ROI “suspeito” quando persistência após débito falhou (flags ou marcadores no detalhe).
 * Uso: apenas em `CREDITO_CONSUMIDO`.
 */
export function creditoConsumidoRoiSuspeito(row: LinhaCreditoRoiFlags): boolean {
  if (row.persistencia_falhou_apos_debito === true) return true;
  if (row.blindagem_persistencia_falhou_apos_debito === true) return true;
  const d = (row.detalhe ?? "").toLowerCase();
  for (const m of MARKERS_DETALHE_ROI_SUSPEITO) {
    if (d.includes(m.toLowerCase())) return true;
  }
  return false;
}

export type ResumoRoiConfiabilidade = {
  valor_total_protegido_valido: number;
  valor_total_protegido_suspeito: number;
  total_consultas_validas: number;
  total_consultas_suspeitas: number;
};

function numRoi(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Agrega somas e contagens a partir de linhas `CREDITO_CONSUMIDO` já filtradas (ex.: mês UTC).
 */
export function acumularResumoRoiCreditoPorLinhas(
  linhas: Array<{ valor_evitar_perda: number | null | unknown } & LinhaCreditoRoiFlags>
): ResumoRoiConfiabilidade {
  let valorValido = 0;
  let valorSuspeito = 0;
  let nValidas = 0;
  let nSuspeitas = 0;
  for (const row of linhas) {
    const v = numRoi(row.valor_evitar_perda);
    if (creditoConsumidoRoiSuspeito(row)) {
      valorSuspeito += v;
      nSuspeitas += 1;
    } else {
      valorValido += v;
      nValidas += 1;
    }
  }
  return {
    valor_total_protegido_valido: Math.round(valorValido * 100) / 100,
    valor_total_protegido_suspeito: Math.round(valorSuspeito * 100) / 100,
    total_consultas_validas: nValidas,
    total_consultas_suspeitas: nSuspeitas,
  };
}

const FECHAMENTO: Set<string> = new Set([
  "CONSULTA_SUCESSO",
  "CONSULTA_ERRO",
  "CONSULTA_TIMEOUT",
]);

/** 60s — operação abandonada se INICIO sem fechamento. */
export const JANELA_ABANDONO_MS = 60_000;

export type KpisConciliacao = {
  cSucesso: number;
  dDebito: number;
  eFalha: number;
  cacheHit: number;
  taxaSucessoPct: number;
  alertaDebitoMaiorQueSucesso: boolean;
};

export function calcularKpisConciliacao(contagens: Record<string, number>): KpisConciliacao {
  const cSucesso = contagens["CONSULTA_SUCESSO"] ?? 0;
  const dDebito = contagens["CREDITO_CONSUMIDO"] ?? 0;
  const eFalha =
    (contagens["CONSULTA_ERRO"] ?? 0) + (contagens["CONSULTA_TIMEOUT"] ?? 0);
  const cacheHit = contagens["CACHE_HIT"] ?? 0;
  const denominador = cSucesso + eFalha;
  const taxaSucessoPct =
    denominador > 0 ? Math.round((cSucesso / denominador) * 1000) / 10 : 0;
  return {
    cSucesso,
    dDebito,
    eFalha,
    cacheHit,
    taxaSucessoPct,
    alertaDebitoMaiorQueSucesso: dDebito > cSucesso,
  };
}

export function eventosOrdenadosCronologico(
  linhas: LinhaEventoAuditoriaDb[]
): LinhaEventoAuditoriaDb[] {
  return [...linhas].sort(
    (a, b) => Date.parse(a.criado_em) - Date.parse(b.criado_em)
  );
}

export type GrupoTransacao = {
  chave: string;
  requestId: string | null;
  placa: string;
  cliente_id: string;
  eventos: LinhaEventoAuditoriaDb[];
  classificacao:
    | "saudavel"
    | "erro_sem_debito"
    | "inconsistente_credito_sem_sucesso"
    | "incompleto"
    | "abandonada";
};

function chaveFallback(e: LinhaEventoAuditoriaDb): string {
  const t = Date.parse(e.criado_em);
  const bucket = Number.isFinite(t) ? Math.floor(t / JANELA_ABANDONO_MS) : 0;
  return `${e.placa}|${e.cliente_id}|${e.tipo_consulta ?? ""}|${bucket}`;
}

/**
 * Agrupa por `request_id` quando presente; senão placa + client + bucket de tempo (~60s).
 */
export function agruparEventosEmTransacoes(
  linhas: LinhaEventoAuditoriaDb[]
): GrupoTransacao[] {
  const map = new Map<string, LinhaEventoAuditoriaDb[]>();
  for (const e of linhas) {
    const k =
      e.request_id && e.request_id.trim()
        ? `rid:${e.request_id.trim()}`
        : `fb:${chaveFallback(e)}`;
    const arr = map.get(k) ?? [];
    arr.push(e);
    map.set(k, arr);
  }

  const grupos: GrupoTransacao[] = [];
  for (const [chave, eventos] of map) {
    const ord = eventosOrdenadosCronologico(eventos);
    const first = ord[0];
    if (!first) continue;
    const requestId =
      first.request_id && first.request_id.trim()
        ? first.request_id.trim()
        : null;

    const tipos = new Set(ord.map((x) => x.evento));
    const temInicio = tipos.has("CONSULTA_INICIO");
    const temSucesso = tipos.has("CONSULTA_SUCESSO");
    const temCredito = tipos.has("CREDITO_CONSUMIDO");
    const temErro = tipos.has("CONSULTA_ERRO");
    const temTimeout = tipos.has("CONSULTA_TIMEOUT");
    const temFecho = temSucesso || temErro || temTimeout;

    let classificacao: GrupoTransacao["classificacao"] = "incompleto";
    if (temCredito && !temSucesso) {
      classificacao = "inconsistente_credito_sem_sucesso";
    } else if (temSucesso && temCredito) {
      classificacao = "saudavel";
    } else if ((temErro || temTimeout) && !temCredito) {
      classificacao = "erro_sem_debito";
    } else if (temInicio && !temFecho && !temCredito) {
      const t0 = Date.parse(first.criado_em);
      if (Number.isFinite(t0) && Date.now() - t0 > JANELA_ABANDONO_MS) {
        classificacao = "abandonada";
      } else {
        classificacao = "incompleto";
      }
    }

    grupos.push({
      chave,
      requestId,
      placa: first.placa,
      cliente_id: first.cliente_id,
      eventos: ord,
      classificacao,
    });
  }
  return grupos.sort(
    (a, b) =>
      Date.parse(b.eventos[0]?.criado_em ?? "0") -
      Date.parse(a.eventos[0]?.criado_em ?? "0")
  );
}

export type AgregadoCliente = {
  cliente_id: string;
  creditosConsumidos: number;
  consultasSucesso: number;
  falhas: number;
  inicios: number;
  somaValorEvitarPerda: number;
};

/** Amostra de `CREDITO_CONSUMIDO` + resultado da checagem em `consultas_veiculos`. */
export type LinhaPersistenciaReconciliacao = {
  eventoId: string;
  placa: string;
  cliente_id: string;
  criado_em: string;
  tipo_consulta: string | null;
  detalhe: string | null;
  persistenciaOk: boolean;
  motivoPersistencia: string;
};

export type DashboardReconciliacao = {
  desdeIso: string;
  diasJanela: number;
  kpis: KpisConciliacao;
  agregadoClientes: AgregadoCliente[];
  gruposCriticos: GrupoTransacao[];
  amostrasPersistencia: LinhaPersistenciaReconciliacao[];
  erroLeitura: string | null;
};

export function rotuloClassificacaoGrupo(c: GrupoTransacao["classificacao"]): string {
  switch (c) {
    case "saudavel":
      return "Fluxo saudável (sucesso + débito coerente)";
    case "erro_sem_debito":
      return "Encerrado sem débito (erro/timeout)";
    case "inconsistente_credito_sem_sucesso":
      return "⚠️ Crédito sem CONSULTA_SUCESSO no grupo";
    case "abandonada":
      return "Operação pendente ou abandonada (>60s sem fechamento)";
    default:
      return "Em andamento ou incompleto";
  }
}

function numOuZero(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return 0;
}

/**
 * Agrega por `cliente_id` a partir de linhas já filtradas por período (ex.: últimos 30 dias).
 */
export function agregarPorCliente(linhas: LinhaEventoAuditoriaDb[]): AgregadoCliente[] {
  const map = new Map<string, AgregadoCliente>();
  for (const e of linhas) {
    const id = (e.cliente_id ?? "").trim();
    if (!id) continue;
    let a = map.get(id);
    if (!a) {
      a = {
        cliente_id: id,
        creditosConsumidos: 0,
        consultasSucesso: 0,
        falhas: 0,
        inicios: 0,
        somaValorEvitarPerda: 0,
      };
      map.set(id, a);
    }
    switch (e.evento) {
      case "CREDITO_CONSUMIDO":
        a.creditosConsumidos += 1;
        if (!creditoConsumidoRoiSuspeito(e)) {
          a.somaValorEvitarPerda += numOuZero(e.valor_evitar_perda);
        }
        break;
      case "CONSULTA_SUCESSO":
        a.consultasSucesso += 1;
        break;
      case "CONSULTA_ERRO":
      case "CONSULTA_TIMEOUT":
        a.falhas += 1;
        break;
      case "CONSULTA_INICIO":
        a.inicios += 1;
        break;
      default:
        break;
    }
  }
  for (const a of map.values()) {
    a.somaValorEvitarPerda = Math.round(a.somaValorEvitarPerda * 100) / 100;
  }
  return Array.from(map.values()).sort(
    (x, y) => y.creditosConsumidos - x.creditosConsumidos
  );
}

/** Último `CREDITO_CONSUMIDO` do grupo (para checagem de persistência). */
export function ultimoEventoCreditoNoGrupo(
  g: GrupoTransacao
): LinhaEventoAuditoriaDb | null {
  const creditos = g.eventos.filter((e) => e.evento === "CREDITO_CONSUMIDO");
  if (!creditos.length) return null;
  return creditos[creditos.length - 1] ?? null;
}
