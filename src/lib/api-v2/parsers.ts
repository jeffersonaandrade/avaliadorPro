/**
 * Parsers defensivos para respostas Consultar Placa API v2 (Leilão Prime, roubo, gravame, Renainf).
 * Aceita snake_case e camelCase onde comum.
 */

import type { TipoConsultaRiscoPremium } from "@/lib/consultas-risco-premium";
import { parseValorBRL } from "@/lib/viabilidade";

export type JsonRecord = Record<string, unknown>;

/** Significado comercial das classes Leilão Prime (referência para laudo / cliente final). */
export const LEILAO_PRIME_CLASSIFICACAO_TITULOS: Record<string, string> = {
  A: "Classe A — histórico de oferta com menor grau de severidade (referência de mercado).",
  B: "Classe B — oferta com vínculo típico de instituição financeira ou recuperação de crédito.",
  C: "Classe C — veículo com histórico ligado a seguradora (ex.: sinistro, indenização, leilão de seguradora).",
  D: "Classe D — oferta com histórico mais severo ou recuperação de sinistro (avaliar com cautela).",
};

/** Rótulo curto para badge na UI. */
export const LEILAO_PRIME_CLASSIFICACAO_BADGE: Record<string, string> = {
  A: "Referência de mercado",
  B: "Instituição financeira",
  C: "Seguradora",
  D: "Alto risco / severo",
};

export type LeilaoPrimeRegistro = {
  comitente: string;
  lote: string;
  data_leilao: string;
};

export type LeilaoPrimeIaDano = {
  local: string;
  descricao: string;
  probabilidade: string;
};

export type LeilaoPrimeDossie = {
  classificacao_letra: string;
  /** Título curto do dicionário da API (ex.: classe C) ou fallback interno. */
  classificacao_titulo: string;
  /** Descrição longa do dicionário da API, quando existir. */
  classificacao_descricao: string;
  registros: LeilaoPrimeRegistro[];
  ia_danos: LeilaoPrimeIaDano[];
  fotos_remarketing: string[];
  /** Mantido vazio na serialização — imagens remotas não entram no painel/PDF rasterizado. */
  imagens_ia: string[];
};

export type SinistroDossie = {
  /** Ex.: "CONSTA INDENIZAÇÃO INTEGRAL". */
  registro: string;
};

export type RouboFurtoRegistro = {
  boletim_ocorrencia: string;
  data_boletim_ocorrencia: string;
  tipo_ocorrencia: string;
  uf_ocorrencia: string;
};

export type RouboFurtoDossie = {
  registros: RouboFurtoRegistro[];
};

export type GravameDossie = {
  agente_financeiro_nome: string;
  /** CNPJ do agente (somente dígitos ou formatado), quando a API retornar. */
  agente_financeiro_cnpj: string;
  data_registro: string;
  situacao: string;
};

export type RenainfInfracao = {
  infracao: string;
  orgao_autuador: string;
  valor_aplicado: string;
  local_infracao: string;
  numero_auto_infracao?: string;
  data_hora_infracao?: string;
  municipio?: string;
};

export type RenainfDossie = {
  infracoes: RenainfInfracao[];
  /** Soma dos valores aplicados (reais), quando disponível. */
  valor_total_reais: number;
};

export type ConsultaPremiumDossie =
  | { tipo: "leilao"; dados: LeilaoPrimeDossie }
  | { tipo: "roubo_furto"; dados: RouboFurtoDossie }
  | { tipo: "gravame"; dados: GravameDossie }
  | { tipo: "sinistro"; dados: SinistroDossie }
  | { tipo: "renainf"; dados: RenainfDossie }
  | null;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function rec(v: unknown): JsonRecord | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as JsonRecord;
}

/** Extrai URLs de string ou objeto { url }. */
function coletarUrls(v: unknown): string[] {
  const out: string[] = [];
  for (const x of arr(v)) {
    if (typeof x === "string" && x.startsWith("http")) out.push(x);
    else {
      const o = rec(x);
      const u = o ? str(o.url ?? o.link ?? o.src) : "";
      if (u.startsWith("http")) out.push(u);
    }
  }
  return out;
}

function letraClassificacao(raw: unknown): string {
  const s = str(raw).toUpperCase();
  const m = s.match(/[ABCD]/);
  return m ? m[0] : (s.length === 1 && "ABCD".includes(s) ? s : "");
}

export function tituloClassificacaoLeilaoPrime(letra: string): string {
  const L = letra.toUpperCase();
  return LEILAO_PRIME_CLASSIFICACAO_TITULOS[L] ?? `Classe ${L || "?"} — consulte o suporte para interpretação.`;
}

function mapRegistroLeilaoPrime(r: unknown): LeilaoPrimeRegistro | null {
  const o = rec(r);
  if (!o) return null;
  return {
    comitente: str(o.comitente ?? o.leiloeiro ?? o.nome_comitente),
    lote: str(o.lote ?? o.numero_lote ?? o.lote_numero),
    data_leilao: str(o.data_leilao ?? o.dataLeilao ?? o.data),
  };
}

export function parsearLeilaoPrimeDossie(
  dados: JsonRecord
): LeilaoPrimeDossie | null {
  const inf = rec(dados.informacoes_sobre_leilao);
  if (!inf) return null;

  const regOferta = rec(inf.registro_sobre_oferta ?? inf.registroSobreOferta);
  const clsRaw =
    regOferta?.classificacao ??
    inf.classificacao ??
    inf.classificacao_leilao;
  const letra = letraClassificacao(clsRaw);

  const dicionario = rec(
    regOferta?.dicionario_classificacoes ??
      regOferta?.dicionarioClassificacoes
  );
  let tituloApi = "";
  let descricaoApi = "";
  if (letra && dicionario) {
    const entry = rec(dicionario[letra] ?? dicionario[letra.toLowerCase()]);
    tituloApi = str(entry?.titulo);
    descricaoApi = str(entry?.descricao);
  }
  const classificacao_titulo =
    tituloApi || (letra ? tituloClassificacaoLeilaoPrime(letra) : "");
  const classificacao_descricao = descricaoApi;

  const regLeiloes = rec(inf.registro_leiloes ?? inf.registroLeiloes);
  const fromRegLeiloes = arr(regLeiloes?.registros);
  const fromLegacy = arr(
    inf.registros ?? inf.registros_leilao ?? inf.registrosLeilao
  );
  const registrosRaw =
    fromRegLeiloes.length > 0 ? fromRegLeiloes : fromLegacy;
  const registros: LeilaoPrimeRegistro[] = registrosRaw
    .map(mapRegistroLeilaoPrime)
    .filter((x): x is LeilaoPrimeRegistro => x !== null);

  const iaRoot = rec(
    dados.informacoes_possiveis_danos_detectados_por_ia ??
      dados.informacoesPossiveisDanosDetectadosPorIa
  );
  const iaBlockLegado = rec(inf.ia_danos ?? inf.iaDanos);
  const iaBlock = iaRoot ?? iaBlockLegado;
  const possiveis = arr(
    iaBlock?.possiveis_dados ??
      iaBlock?.possiveisDados ??
      iaBlock?.possiveis_danos ??
      iaBlock?.possiveisDanos
  );
  const ia_danos: LeilaoPrimeIaDano[] = possiveis
    .map((p) => {
      const o = rec(p);
      if (!o) return null;
      return {
        local: str(o.local ?? o.local_dano),
        descricao: str(o.descricao ?? o.descricao_dano),
        probabilidade: str(
          o.probabilidade ?? o.probabilidade_percentual ?? o.score
        ),
      };
    })
    .filter(
      (x): x is LeilaoPrimeIaDano =>
        x !== null &&
        (Boolean(x.local) || Boolean(x.descricao) || Boolean(x.probabilidade))
  );

  const rem = rec(
    dados.informacoes_sobre_remarketing ?? dados.informacoesSobreRemarketing
  );
  const fotosRemarketingRoot = coletarUrls(rem?.fotos);
  const fotosRemarketingInf = coletarUrls(
    inf.fotos ?? inf.fotos_remarketing ?? inf.fotosRemarketing
  );
  const fotos_remarketing = [
    ...fotosRemarketingRoot,
    ...fotosRemarketingInf,
  ].filter((u, i, a) => a.indexOf(u) === i);

  /** URLs de IA não persistem no dossiê serializado — só texto (danos) é exibido. */
  const imagens_ia: string[] = [];

  return {
    classificacao_letra: letra,
    classificacao_titulo,
    classificacao_descricao,
    registros,
    ia_danos,
    fotos_remarketing,
    imagens_ia,
  };
}

export function parsearRouboFurtoDossie(dados: JsonRecord): RouboFurtoDossie {
  const h = rec(dados.historico_roubo_furto ?? dados.historicoRouboFurto);
  const rf = rec(h?.registros_roubo_furto ?? h?.registrosRouboFurto);
  const regs = arr(rf?.registros);
  const registros: RouboFurtoRegistro[] = regs
    .map((r) => {
      const o = rec(r);
      if (!o) return null;
      return {
        boletim_ocorrencia: str(
          o.boletim_ocorrencia ?? o.boletimOcorrencia ?? o.bo
        ),
        data_boletim_ocorrencia: str(
          o.data_boletim_ocorrencia ??
            o.dataBoletimOcorrencia ??
            o.data_ocorrencia
        ),
        tipo_ocorrencia: str(o.tipo_ocorrencia ?? o.tipoOcorrencia ?? o.tipo),
        uf_ocorrencia: str(o.uf_ocorrencia ?? o.ufOcorrencia ?? o.uf),
      };
    })
    .filter((x): x is RouboFurtoRegistro => x !== null);
  return { registros };
}

export function parsearGravameDossie(dados: JsonRecord): GravameDossie | null {
  const g = rec(dados.gravame);
  if (!g) return null;
  const reg = rec(g.registro);
  const agente = rec(reg?.agente_financeiro ?? reg?.agenteFinanceiro);
  return {
    agente_financeiro_nome: str(agente?.nome ?? reg?.agente_financeiro_nome),
    agente_financeiro_cnpj: str(
      agente?.cnpj ??
        agente?.cnpj_agente ??
        reg?.cnpj_agente ??
        reg?.cnpj
    ),
    data_registro: str(reg?.data_registro ?? reg?.dataRegistro),
    situacao: str(reg?.situacao),
  };
}

function extrairInfracaoRenainfDeItem(item: unknown): RenainfInfracao | null {
  const o = rec(item);
  if (!o) return null;
  const di = rec(o.dados_infracao ?? o.dadosInfracao);
  const src = di ?? o;
  const ev = rec(o.eventos);
  const infracao = str(src.infracao ?? o.descricao ?? o.tipo_infracao);
  const orgao_autuador = str(src.orgao_autuador ?? o.orgaoAutuador ?? o.orgao);
  const valor_aplicado = str(src.valor_aplicado ?? o.valorAplicado ?? o.valor);
  const local_infracao = str(
    src.local_infracao ??
      o.localInfracao ??
      o.local ??
      src.municipio ??
      o.municipio
  );
  const numero_auto_infracao = str(
    src.numero_auto_infracao ?? src.numeroAutoInfracao ?? o.numero_auto
  );
  const data_hora_infracao = str(
    ev?.data_hora_infracao ??
      ev?.dataHoraInfracao ??
      src.data_hora_infracao ??
      o.data_hora_infracao
  );
  const municipio = str(src.municipio ?? o.municipio);
  const out: RenainfInfracao = {
    infracao,
    orgao_autuador,
    valor_aplicado,
    local_infracao,
  };
  if (numero_auto_infracao) out.numero_auto_infracao = numero_auto_infracao;
  if (data_hora_infracao) out.data_hora_infracao = data_hora_infracao;
  if (municipio) out.municipio = municipio;
  return out;
}

/** Busca infrações Renainf em chaves comuns no objeto `dados`. */
export function parsearRenainfDossie(dados: JsonRecord): RenainfDossie {
  const regDeb = rec(
    dados.registro_debitos_por_infracoes_renainf ??
      dados.registroDebitosPorInfracoesRenainf
  );
  const infracoesRen = rec(
    regDeb?.infracoes_renainf ?? regDeb?.infracoesRenainf
  );
  let lista: unknown[] = arr(infracoesRen?.infracoes);

  if (!lista.length) {
    const candidatos = [
      dados.infracoes_renainf,
      dados.infracoesRenainf,
      dados.renainf,
      rec(dados.historico_renainf)?.infracoes,
      rec(dados.renainf)?.infracoes,
    ];
    for (const c of candidatos) {
      const a = arr(c);
      if (a.length) {
        lista = a;
        break;
      }
      const o = rec(c);
      if (o) {
        const inner = arr(o.infracoes ?? o.registros);
        if (inner.length) {
          lista = inner;
          break;
        }
      }
    }
  }

  const infracoes: RenainfInfracao[] = lista
    .map(extrairInfracaoRenainfDeItem)
    .filter(
      (x): x is RenainfInfracao =>
        x !== null &&
        (Boolean(x.infracao) ||
          Boolean(x.orgao_autuador) ||
          Boolean(x.valor_aplicado) ||
          Boolean(x.local_infracao) ||
          Boolean(x.numero_auto_infracao) ||
          Boolean(x.data_hora_infracao) ||
          Boolean(x.municipio))
    );

  let soma = 0;
  for (const inf of infracoes) {
    const v = parseValorBRL(inf.valor_aplicado);
    if (Number.isFinite(v)) soma += v;
  }
  const valor_total_reais = Math.round(soma * 100) / 100;
  return { infracoes, valor_total_reais };
}

export function extrairDossieConsultaPremium(
  tipo: TipoConsultaRiscoPremium,
  dados: JsonRecord
): ConsultaPremiumDossie {
  switch (tipo) {
    case "leilao": {
      const d = parsearLeilaoPrimeDossie(dados);
      return d ? { tipo: "leilao", dados: d } : null;
    }
    case "roubo_furto":
      return { tipo: "roubo_furto", dados: parsearRouboFurtoDossie(dados) };
    case "gravame": {
      const d = parsearGravameDossie(dados);
      return d ? { tipo: "gravame", dados: d } : null;
    }
    case "sinistro": {
      const rs = rec(
        dados.registro_sinistro_com_perda_total ??
          dados.registroSinistroComPerdaTotal
      );
      let registro = "";
      const raw = rs?.registro;
      if (typeof raw === "string") registro = raw.trim();
      else if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
        const jr = raw as JsonRecord;
        registro = str(jr.texto ?? jr.descricao ?? jr.resumo ?? jr.mensagem);
      }
      return { tipo: "sinistro", dados: { registro } };
    }
    case "renainf":
      return { tipo: "renainf", dados: parsearRenainfDossie(dados) };
    default:
      return null;
  }
}

export function renainfDossieParaJson(d: RenainfDossie): unknown {
  return {
    tipo: "renainf",
    infracoes: d.infracoes,
    valor_total_reais: d.valor_total_reais,
  };
}

/** Lê o objeto `dossie` salvo em `consultas_premium[tipo]`. */
export function dossieFromStoredBlock(raw: unknown): ConsultaPremiumDossie | null {
  const o = rec(raw);
  if (!o) return null;
  const k = str(o.kind ?? o.tipo);
  if (k === "leilao" || k === "leilao_prime") {
    const d: LeilaoPrimeDossie = {
      classificacao_letra: str(o.classificacao_letra),
      classificacao_titulo: str(o.classificacao_titulo),
      classificacao_descricao: str(o.classificacao_descricao),
      registros: arr(o.registros).flatMap((r) => {
        const x = rec(r);
        if (!x) return [];
        return [
          {
            comitente: str(x.comitente),
            lote: str(x.lote),
            data_leilao: str(x.data_leilao),
          },
        ];
      }),
      ia_danos: arr(o.ia_danos).flatMap((p) => {
        const x = rec(p);
        if (!x) return [];
        return [
          {
            local: str(x.local),
            descricao: str(x.descricao),
            probabilidade: str(x.probabilidade),
          },
        ];
      }),
      fotos_remarketing: arr(o.fotos_remarketing).filter(
        (x): x is string => typeof x === "string"
      ),
      imagens_ia: arr(o.imagens_ia).filter(
        (x): x is string => typeof x === "string"
      ),
    };
    return { tipo: "leilao", dados: d };
  }
  if (k === "roubo_furto") {
    return {
      tipo: "roubo_furto",
      dados: {
        registros: arr(o.registros).flatMap((r) => {
          const x = rec(r);
          if (!x) return [];
          return [
            {
              boletim_ocorrencia: str(x.boletim_ocorrencia),
              data_boletim_ocorrencia: str(x.data_boletim_ocorrencia),
              tipo_ocorrencia: str(x.tipo_ocorrencia),
              uf_ocorrencia: str(x.uf_ocorrencia),
            },
          ];
        }),
      },
    };
  }
  if (k === "gravame") {
    return {
      tipo: "gravame",
      dados: {
        agente_financeiro_nome: str(o.agente_financeiro_nome),
        agente_financeiro_cnpj: str(
          o.agente_financeiro_cnpj ?? o.cnpj_agente ?? o.cnpj
        ),
        data_registro: str(o.data_registro),
        situacao: str(o.situacao),
      },
    };
  }
  if (k === "renainf") {
    const d = renainfFromStored(o);
    return d ? { tipo: "renainf", dados: d } : null;
  }
  if (k === "sinistro") {
    const pl = rec(o.payload);
    const rawReg = o.registro ?? pl?.registro;
    let registro = "";
    if (typeof rawReg === "string") registro = rawReg.trim();
    else if (
      rawReg != null &&
      typeof rawReg === "object" &&
      !Array.isArray(rawReg)
    ) {
      const jr = rawReg as JsonRecord;
      registro = str(jr.texto ?? jr.descricao ?? jr.resumo ?? jr.mensagem);
    }
    return { tipo: "sinistro", dados: { registro } };
  }
  return null;
}

export function renainfFromStored(raw: unknown): RenainfDossie | null {
  const o = rec(raw);
  if (!o) return null;
  const k = str(o.tipo ?? o.kind);
  if (k !== "renainf") return null;
  const infracoes = arr(o.infracoes).flatMap((r) => {
    const parsed = extrairInfracaoRenainfDeItem(r);
    return parsed ? [parsed] : [];
  });
  const vtRaw = o.valor_total_reais;
  let valor_total_reais =
    typeof vtRaw === "number" && Number.isFinite(vtRaw) ? vtRaw : NaN;
  if (!Number.isFinite(valor_total_reais)) {
    let s = 0;
    for (const i of infracoes) {
      const v = parseValorBRL(i.valor_aplicado);
      if (Number.isFinite(v)) s += v;
    }
    valor_total_reais = Math.round(s * 100) / 100;
  }
  return { infracoes, valor_total_reais };
}

export function serializarDossieParaPersistencia(
  tipo: TipoConsultaRiscoPremium,
  dossie: ConsultaPremiumDossie
): Record<string, unknown> | null {
  if (!dossie) return null;
  if (dossie.tipo === "leilao")
    return { kind: "leilao_prime", ...dossie.dados };
  if (dossie.tipo === "roubo_furto")
    return { kind: "roubo_furto", registros: dossie.dados.registros };
  if (dossie.tipo === "gravame")
    return { kind: "gravame", ...dossie.dados };
  if (dossie.tipo === "sinistro")
    return { kind: "sinistro", registro: dossie.dados.registro };
  if (dossie.tipo === "renainf")
    return {
      kind: "renainf",
      infracoes: dossie.dados.infracoes,
      valor_total_reais: dossie.dados.valor_total_reais,
    };
  return null;
}

/** Total em reais das multas Renainf (bloco dedicado ou legado `evidencias_renainf`). */
export function totalRenainfReaisDeDadosLeilao(raw: unknown): number {
  const root = rec(raw);
  if (!root) return 0;
  const block = rec(root.consultas_premium);
  const itemRen = block ? rec(block.renainf) : null;
  const doss = itemRen ? dossieFromStoredBlock(itemRen.dossie) : null;
  if (doss?.tipo === "renainf") {
    const t = doss.dados.valor_total_reais;
    return Number.isFinite(t) ? Math.max(0, t) : 0;
  }
  const legado = renainfFromStored(root.evidencias_renainf);
  if (!legado) return 0;
  const t = legado.valor_total_reais;
  return Number.isFinite(t) ? Math.max(0, t) : 0;
}

export type DebitosRenainfPdf = {
  totalReais: number;
  itens: RenainfInfracao[];
};

/** Dados para a seção “Débitos e Infrações” do PDF (prova na negociação). */
export function extrairDebitosRenainfParaPdf(
  dadosLeilao: unknown
): DebitosRenainfPdf | null {
  const root = rec(dadosLeilao);
  if (!root) return null;
  const block = rec(root.consultas_premium);
  const itemRen = block ? rec(block.renainf) : null;
  const doss = itemRen ? dossieFromStoredBlock(itemRen.dossie) : null;
  if (doss?.tipo === "renainf" && doss.dados.infracoes.length > 0) {
    return { totalReais: doss.dados.valor_total_reais, itens: doss.dados.infracoes };
  }
  const leg = renainfFromStored(root.evidencias_renainf);
  if (!leg?.infracoes.length) return null;
  return { totalReais: leg.valor_total_reais, itens: leg.infracoes };
}

export type LaudoTecnicoRiscosPdf = {
  leilaoParagrafos: string[];
  sinistroLinhas: string[];
  rouboLinhas: string[];
  gravameLinhas: string[];
  renainfLinhas: string[];
};

/** Monta textos para a seção “Detalhamento técnico de riscos” do PDF. */
export function extrairLaudoTecnicoParaPdf(
  dadosLeilao: unknown
): LaudoTecnicoRiscosPdf {
  const out: LaudoTecnicoRiscosPdf = {
    leilaoParagrafos: [],
    sinistroLinhas: [],
    rouboLinhas: [],
    gravameLinhas: [],
    renainfLinhas: [],
  };
  const root = rec(dadosLeilao);
  if (!root) return out;
  const block = rec(root.consultas_premium);
  if (block) {
    const itemLeilao = rec(block.leilao);
    const leilao = dossieFromStoredBlock(itemLeilao?.dossie);
    if (leilao?.tipo === "leilao") {
      const d = leilao.dados;
      if (d.classificacao_letra) {
        out.leilaoParagrafos.push(
          `Classificação Leilão Prime: ${d.classificacao_letra} — ${d.classificacao_titulo || tituloClassificacaoLeilaoPrime(d.classificacao_letra)}.`
        );
      }
      if (d.classificacao_descricao) {
        out.leilaoParagrafos.push(d.classificacao_descricao);
      }
      for (const r of d.registros) {
        out.leilaoParagrafos.push(
          `Leilão — comitente (leiloeiro): ${r.comitente || "—"}, lote ${r.lote || "—"}, data ${r.data_leilao || "—"}.`
        );
      }
      if (d.ia_danos.length) {
        out.leilaoParagrafos.push(
          "Indícios automáticos (IA — somente texto, sem imagens): " +
            d.ia_danos
              .map(
                (x) =>
                  `${x.local || "?"} — ${x.descricao || ""} (prob. ${x.probabilidade || "n/d"})`
              )
              .join(" · ")
        );
      }
    }
    const itemSin = rec(block.sinistro);
    const sinD = dossieFromStoredBlock(itemSin?.dossie);
    if (sinD?.tipo === "sinistro" && sinD.dados.registro) {
      out.sinistroLinhas.push(
        `Sinistro (perda total): ${sinD.dados.registro}`
      );
    }
    const itemRoubo = rec(block.roubo_furto);
    const roubo = dossieFromStoredBlock(itemRoubo?.dossie);
    if (roubo?.tipo === "roubo_furto") {
      for (const r of roubo.dados.registros) {
        out.rouboLinhas.push(
          `${r.data_boletim_ocorrencia || "—"} · ${r.tipo_ocorrencia || "Ocorrência"} · BO ${r.boletim_ocorrencia || "—"} · ${r.uf_ocorrencia || ""}`
        );
      }
    }
    const itemGrav = rec(block.gravame);
    const grav = dossieFromStoredBlock(itemGrav?.dossie);
    if (grav?.tipo === "gravame") {
      const g = grav.dados;
      const cnpj = g.agente_financeiro_cnpj?.trim();
      const banco = g.agente_financeiro_nome || "—";
      out.gravameLinhas.push(
        [
          cnpj ? `CNPJ: ${cnpj}` : null,
          `Banco / agente: ${banco}`,
          g.data_registro ? `Registro: ${g.data_registro}` : null,
          g.situacao ? `Situação: ${g.situacao}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      );
    }
    const itemRen = rec(block.renainf);
    const renPremium = dossieFromStoredBlock(itemRen?.dossie);
    if (renPremium?.tipo === "renainf" && renPremium.dados.infracoes.length) {
      for (const i of renPremium.dados.infracoes) {
        const partes = [
          i.infracao,
          i.orgao_autuador && `Órgão: ${i.orgao_autuador}`,
          i.valor_aplicado && `Valor: ${i.valor_aplicado}`,
          i.local_infracao && `Local: ${i.local_infracao}`,
          i.numero_auto_infracao && `Auto: ${i.numero_auto_infracao}`,
          i.data_hora_infracao && `Data infração: ${i.data_hora_infracao}`,
          i.municipio && `Município: ${i.municipio}`,
        ].filter(Boolean);
        out.renainfLinhas.push(partes.join(" · "));
      }
    }
  }
  const ren = renainfFromStored(root.evidencias_renainf);
  if (!out.renainfLinhas.length && ren?.infracoes.length) {
    for (const i of ren.infracoes) {
      const partes = [
        i.infracao,
        i.orgao_autuador && `Órgão: ${i.orgao_autuador}`,
        i.valor_aplicado && `Valor: ${i.valor_aplicado}`,
        i.local_infracao && `Local: ${i.local_infracao}`,
        i.numero_auto_infracao && `Auto: ${i.numero_auto_infracao}`,
        i.data_hora_infracao && `Data infração: ${i.data_hora_infracao}`,
        i.municipio && `Município: ${i.municipio}`,
      ].filter(Boolean);
      out.renainfLinhas.push(partes.join(" · "));
    }
  }
  return out;
}
