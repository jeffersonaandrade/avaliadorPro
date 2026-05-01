"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Shield,
} from "lucide-react";

import {
  dossieFromStoredBlock,
  LEILAO_PRIME_CLASSIFICACAO_BADGE,
  tituloClassificacaoLeilaoPrime,
  type GravameDossie,
  type LeilaoPrimeDossie,
  type RenainfDossie,
  type RouboFurtoDossie,
} from "@/lib/api-v2/parsers";
import type { TipoConsultaRiscoPremium } from "@/lib/consultas-risco-premium";
import { omitirCarregarImagensConsultaPremium } from "@/lib/omitir-midias-consulta-premium";
import { formatarMoedaBRL } from "@/lib/viabilidade";

function rec(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

/** Rótulo legível para chaves do parecer técnico (ex.: registro_frota_locadora). */
function rotuloChaveParecerLeilao(chave: string): string {
  return chave
    .replace(/^registro_/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function lerDossieDoItem(
  tipo: TipoConsultaRiscoPremium,
  item: Record<string, unknown> | null
) {
  if (!item) return null;
  return dossieFromStoredBlock(item.dossie);
}

function CarrosselMidias({
  urls,
  legenda,
}: {
  urls: string[];
  legenda: string;
}) {
  const [i, setI] = useState(0);
  if (!urls.length || omitirCarregarImagensConsultaPremium()) return null;
  const safe = ((i % urls.length) + urls.length) % urls.length;
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {legenda}
      </p>
      <div className="relative mt-2 overflow-hidden rounded-lg bg-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[safe]}
          alt=""
          className="mx-auto max-h-48 w-full object-contain"
        />
        {urls.length > 1 ? (
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white/95 px-2 py-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              aria-label="Anterior"
              onClick={() => setI((x) => x - 1)}
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="text-xs tabular-nums text-slate-600">
              {safe + 1} / {urls.length}
            </span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              aria-label="Próxima"
              onClick={() => setI((x) => x + 1)}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SubtituloDossieTecnico() {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
      Dossiê técnico
    </p>
  );
}

function BlocoLeilao({ d }: { d: LeilaoPrimeDossie }) {
  const letra = d.classificacao_letra?.toUpperCase() ?? "";
  const tituloExibir =
    d.classificacao_titulo ||
    (letra ? tituloClassificacaoLeilaoPrime(letra) : "");
  return (
    <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
      <SubtituloDossieTecnico />
      {letra ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-amber-500 bg-amber-50 px-3 py-1 text-xs font-black text-amber-950">
            <Gavel className="size-3.5 shrink-0" aria-hidden />
            Classe {letra} — {LEILAO_PRIME_CLASSIFICACAO_BADGE[letra] ?? "Classificação"}
          </span>
        </div>
      ) : null}
      {tituloExibir ? (
        <p className="text-xs font-semibold leading-relaxed text-slate-800">
          {tituloExibir}
        </p>
      ) : null}
      {d.classificacao_descricao ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-700">
          {d.classificacao_descricao}
        </div>
      ) : null}
      {d.registros.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Registros de leilão (lotes)
          </p>
          <ul className="mt-3 space-y-3">
            {d.registros.map((r, idx) => (
              <li
                key={`${r.lote}-${idx}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 shadow-sm"
              >
                <p className="font-semibold text-slate-900">
                  Comitente (leiloeiro):{" "}
                  <span className="font-normal">
                    {r.comitente || "—"}
                  </span>
                </p>
                <p className="mt-1 text-slate-600">
                  Lote: <span className="font-mono font-medium">{r.lote || "—"}</span>
                  {" · "}
                  Data do leilão:{" "}
                  <span className="font-medium">{r.data_leilao || "—"}</span>
                </p>
                {(r.veiculo_placa ||
                  r.chassi_mascarado ||
                  r.renavam ||
                  r.ano_fabricacao ||
                  r.ano_modelo ||
                  r.segmento ||
                  r.sub_segmento ||
                  r.numero_motor) ? (
                  <dl className="mt-2 grid gap-1 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
                    {r.veiculo_placa ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium text-slate-500">Placa</dt>
                        <dd className="font-mono">{r.veiculo_placa}</dd>
                      </div>
                    ) : null}
                    {r.chassi_mascarado ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium text-slate-500">Classi</dt>
                        <dd className="font-mono break-all">{r.chassi_mascarado}</dd>
                      </div>
                    ) : null}
                    {r.renavam ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium text-slate-500">Renavam</dt>
                        <dd className="font-mono">{r.renavam}</dd>
                      </div>
                    ) : null}
                    {(r.ano_fabricacao || r.ano_modelo) ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium text-slate-500">Ano</dt>
                        <dd>
                          {r.ano_fabricacao || "—"}
                          {r.ano_modelo ? ` / modelo ${r.ano_modelo}` : ""}
                        </dd>
                      </div>
                    ) : null}
                    {(r.segmento || r.sub_segmento) ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium text-slate-500">Segmento</dt>
                        <dd>
                          {[r.segmento, r.sub_segmento].filter(Boolean).join(" · ")}
                        </dd>
                      </div>
                    ) : null}
                    {r.numero_motor ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium text-slate-500">Motor</dt>
                        <dd className="font-mono break-all">{r.numero_motor}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {d.sinistros_acidentes_possui_registro ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 px-3 py-2.5 text-xs text-amber-950">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/90">
            Sinistros e acidentes (fonte)
          </p>
          <p className="mt-1 font-medium capitalize">
            {d.sinistros_acidentes_possui_registro}
          </p>
        </div>
      ) : null}
      {d.parecer_tecnico_parecer ||
      (d.parecer_tecnico_detalhes &&
        Object.keys(d.parecer_tecnico_detalhes).length > 0) ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Parecer técnico
          </p>
          {d.parecer_tecnico_parecer ? (
            <p className="mt-2 text-sm font-semibold capitalize text-slate-900">
              {d.parecer_tecnico_parecer}
            </p>
          ) : null}
          {d.parecer_tecnico_detalhes ? (
            <ul className="mt-2 space-y-1 text-[11px] text-slate-700">
              {Object.entries(d.parecer_tecnico_detalhes).map(([ck, cv]) => (
                <li key={ck}>
                  <span className="font-medium text-slate-600">
                    {rotuloChaveParecerLeilao(ck)}:
                  </span>{" "}
                  <span className="capitalize">{cv}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {d.remarketing_registros && d.remarketing_registros.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Remarketing (eventos)
          </p>
          <ul className="mt-2 space-y-2 text-xs text-slate-800">
            {d.remarketing_registros.map((rm, idx) => (
              <li
                key={`${rm.item}-${idx}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
              >
                <p className="font-semibold">
                  {rm.organizador || "Organizador —"}{" "}
                  {rm.data_evento ? (
                    <span className="font-normal text-slate-600">
                      · {rm.data_evento}
                    </span>
                  ) : null}
                </p>
                {rm.item ? (
                  <p className="mt-1 text-slate-600">
                    Item: <span className="font-mono">{rm.item}</span>
                  </p>
                ) : null}
                {(rm.condicao_geral_veiculo ||
                  rm.condicao_motor ||
                  rm.condicao_cambio) ? (
                  <p className="mt-1 text-[11px] text-slate-600">
                    {[
                      rm.condicao_geral_veiculo
                        ? `Geral: ${rm.condicao_geral_veiculo}`
                        : null,
                      rm.condicao_motor ? `Motor: ${rm.condicao_motor}` : null,
                      rm.condicao_cambio
                        ? `Câmbio: ${rm.condicao_cambio}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {d.ia_situacao_analise ? (
        <p className="text-[11px] font-medium text-violet-900/90">
          Situação da análise por IA:{" "}
          <span className="capitalize">{d.ia_situacao_analise}</span>
        </p>
      ) : null}
      {d.ia_danos.length > 0 ? (
        <div className="rounded-xl border border-violet-200/80 bg-violet-50/50 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-900">
            <AlertTriangle className="size-3.5" aria-hidden />
            Danos sugeridos pela IA (texto)
          </p>
          <ul className="mt-2 space-y-2 text-xs text-violet-950">
            {d.ia_danos.map((x, idx) => (
              <li key={idx}>
                <span className="font-semibold">{x.local || "Local"}:</span>{" "}
                {x.descricao || "—"}{" "}
                <span className="tabular-nums text-violet-800">
                  ({x.probabilidade || "prob. n/d"})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {d.ia_pecas_danificadas && d.ia_pecas_danificadas.length > 0 ? (
        <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-900">
            Peças com indício (IA)
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-violet-950">
            {d.ia_pecas_danificadas.map((x, idx) => (
              <li key={idx}>
                <span className="font-semibold">{x.descricao || "Peça"}</span>
                {x.probabilidade ? (
                  <span className="ms-1 tabular-nums text-violet-800">
                    ({x.probabilidade})
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {omitirCarregarImagensConsultaPremium() &&
      d.fotos_remarketing.length > 0 ? (
        <p className="text-[11px] leading-relaxed text-slate-500">
          {d.fotos_remarketing.length} foto(s) de remarketing disponíveis na API —
          omitidas neste ambiente para evitar timeout; use o painel completo fora do
          deploy limitado se precisar das imagens.
        </p>
      ) : null}
      <CarrosselMidias urls={d.fotos_remarketing} legenda="Fotos (remarketing)" />
    </div>
  );
}

function BlocoSinistro({ registro }: { registro: string }) {
  if (!registro.trim()) return null;
  return (
    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
      <SubtituloDossieTecnico />
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Registro (perda total)
        </p>
        <p className="mt-2 font-semibold leading-snug">{registro}</p>
      </div>
    </div>
  );
}

function BlocoRoubo({ d }: { d: RouboFurtoDossie }) {
  if (!d.registros.length) return null;
  const ordenados = [...d.registros].sort((a, b) =>
    (b.data_boletim_ocorrencia || "").localeCompare(a.data_boletim_ocorrencia || "")
  );
  return (
    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
      <SubtituloDossieTecnico />
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Boletins de ocorrência e ocorrências
        </p>
        <ol className="relative mt-3 ms-2 space-y-3 border-s border-slate-200 ps-4">
          {ordenados.map((r, idx) => (
            <li key={`${r.boletim_ocorrencia}-${idx}`} className="last:mb-0">
              <span
                className="absolute -start-[5px] mt-1.5 size-2.5 rounded-full bg-indigo-500"
                aria-hidden
              />
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
                <p className="font-bold text-slate-900">
                  {r.tipo_ocorrencia || "Tipo não informado"}
                </p>
                <p className="mt-1 text-slate-600">
                  Data do B.O.:{" "}
                  <span className="font-medium">
                    {r.data_boletim_ocorrencia || "—"}
                  </span>
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-700">
                  B.O. nº {r.boletim_ocorrencia || "—"} · UF{" "}
                  {r.uf_ocorrencia || "—"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function BlocoRenainf({ d }: { d: RenainfDossie }) {
  if (!d.infracoes.length) return null;
  return (
    <div
      className="mt-4 space-y-3 border-t border-orange-100 pt-4"
      data-testid="card-renainf-evidencias"
    >
      <SubtituloDossieTecnico />
      <p className="text-[10px] font-bold uppercase tracking-wide text-orange-900">
        Total estimado das multas
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-orange-900/85">
        A fonte lista débitos em aberto ou já executados (multa emitida). Confirme
        pagamento e recurso diretamente com o órgão autuador.
      </p>
      <p className="text-xl font-black tabular-nums text-orange-950">
        {formatarMoedaBRL(d.valor_total_reais)}
      </p>
      <div className="rounded-xl border border-orange-100 bg-slate-50 p-3">
        <ul className="space-y-3 text-xs text-orange-950">
          {d.infracoes.map((inf, idx) => (
            <li
              key={idx}
              className="rounded-lg border border-orange-100 bg-white px-3 py-2.5 shadow-sm"
            >
              <p className="font-semibold text-slate-900">{inf.infracao}</p>
              <p className="mt-1 text-orange-900/95">
                <span className="font-medium">Órgão autuador:</span>{" "}
                {inf.orgao_autuador || "—"}
              </p>
              <p className="mt-1 tabular-nums font-semibold">
                <span className="font-medium text-orange-900">Valor aplicado:</span>{" "}
                {inf.valor_aplicado || "—"}
              </p>
              <p className="mt-1 text-orange-800/90">
                <span className="font-medium">Local:</span>{" "}
                {inf.local_infracao || "—"}
              </p>
              {inf.numero_auto_infracao ? (
                <p className="mt-1 font-mono text-[11px] text-orange-900/90">
                  <span className="font-sans font-medium">Auto de infração:</span>{" "}
                  {inf.numero_auto_infracao}
                </p>
              ) : null}
              {inf.data_hora_infracao ? (
                <p className="mt-0.5 text-orange-900/85">
                  <span className="font-medium">Data da infração:</span>{" "}
                  {inf.data_hora_infracao.trim()}
                </p>
              ) : null}
              {inf.municipio ? (
                <p className="mt-0.5 text-orange-900/85">
                  <span className="font-medium">Município:</span> {inf.municipio}
                </p>
              ) : null}
              {inf.tipo_auto_infracao ? (
                <p className="mt-1 font-mono text-[11px] text-orange-900/80">
                  <span className="font-sans font-medium">Tipo auto:</span>{" "}
                  {inf.tipo_auto_infracao}
                </p>
              ) : null}
              {inf.aplicacao_unidade_medida ||
              inf.aplicacao_limite_permitido ||
              inf.aplicacao_medicao_real ? (
                <p className="mt-2 border-t border-orange-100/80 pt-2 text-orange-900/90">
                  <span className="font-medium">Medição / aplicação:</span>{" "}
                  {[
                    inf.aplicacao_unidade_medida &&
                      `Unidade: ${inf.aplicacao_unidade_medida}`,
                    inf.aplicacao_limite_permitido &&
                      `Limite: ${inf.aplicacao_limite_permitido}`,
                    inf.aplicacao_medicao_considerada &&
                      `Considerada: ${inf.aplicacao_medicao_considerada}`,
                    inf.aplicacao_medicao_real &&
                      `Real: ${inf.aplicacao_medicao_real}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              {inf.data_cadastramento || inf.data_notificacao || inf.data_emissao_penalidade ? (
                <div className="mt-1 space-y-0.5 text-[11px] text-orange-900/80">
                  {inf.data_cadastramento ? (
                    <p>
                      <span className="font-medium">Cadastramento:</span>{" "}
                      {inf.data_cadastramento.trim()}
                    </p>
                  ) : null}
                  {inf.data_notificacao ? (
                    <p>
                      <span className="font-medium">Notificação:</span>{" "}
                      {inf.data_notificacao.trim()}
                    </p>
                  ) : null}
                  {inf.data_emissao_penalidade ? (
                    <p>
                      <span className="font-medium">Emissão penalidade:</span>{" "}
                      {inf.data_emissao_penalidade.trim()}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BlocoGravame({ d }: { d: GravameDossie }) {
  const cnpj = d.agente_financeiro_cnpj?.trim();
  const placaReg = d.registro_placa?.trim();
  const chassi = d.registro_chassi?.trim();
  const ufPlaca = d.registro_uf_placa?.trim();
  if (
    !d.agente_financeiro_nome &&
    !cnpj &&
    !d.data_registro &&
    !d.situacao &&
    !placaReg &&
    !chassi &&
    !ufPlaca
  ) {
    return null;
  }
  return (
    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
      <SubtituloDossieTecnico />
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Gravame — agente e situação
        </p>
        <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
          <p className="flex items-center gap-2 font-semibold text-slate-900">
            <Shield className="size-4 text-slate-500" aria-hidden />
            {d.agente_financeiro_nome || "—"}
          </p>
          {cnpj ? (
            <p className="mt-2 font-mono text-[11px] text-slate-700">
              <span className="font-sans font-medium text-slate-600">CNPJ:</span>{" "}
              {cnpj}
            </p>
          ) : null}
          <p className="mt-2 text-slate-600">
            <span className="font-medium">Data de registro:</span>{" "}
            {d.data_registro || "—"}
          </p>
          <p className="mt-1 text-slate-700">
            <span className="font-medium">Situação:</span> {d.situacao || "—"}
          </p>
          {placaReg || chassi || ufPlaca ? (
            <div className="mt-3 border-t border-slate-100 pt-2 text-slate-600">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Veículo no registro
              </p>
              {placaReg ? (
                <p className="mt-1 font-mono text-[11px]">
                  <span className="font-sans font-medium text-slate-600">Placa:</span>{" "}
                  {placaReg}
                </p>
              ) : null}
              {chassi ? (
                <p className="mt-1 font-mono text-[11px]">
                  <span className="font-sans font-medium text-slate-600">Chassi:</span>{" "}
                  {chassi}
                </p>
              ) : null}
              {ufPlaca ? (
                <p className="mt-1">
                  <span className="font-medium">UF da placa:</span> {ufPlaca}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type DossieEvidenciasPremiumProps = {
  tipo: TipoConsultaRiscoPremium;
  itemPremium: Record<string, unknown> | null;
};

export function DossieEvidenciasPremium({
  tipo,
  itemPremium,
}: DossieEvidenciasPremiumProps) {
  const dossie = lerDossieDoItem(tipo, itemPremium);
  if (!dossie) return null;

  if (dossie.tipo === "leilao") {
    const omitirImg = omitirCarregarImagensConsultaPremium();
    const detPar = dossie.dados.parecer_tecnico_detalhes;
    const tem =
      dossie.dados.registros.length > 0 ||
      dossie.dados.ia_danos.length > 0 ||
      (!omitirImg && dossie.dados.fotos_remarketing.length > 0) ||
      Boolean(dossie.dados.classificacao_letra) ||
      Boolean(dossie.dados.classificacao_descricao) ||
      Boolean(dossie.dados.sinistros_acidentes_possui_registro) ||
      Boolean(dossie.dados.parecer_tecnico_parecer) ||
      Boolean(detPar && Object.keys(detPar).length > 0) ||
      Boolean(dossie.dados.remarketing_registros?.length) ||
      Boolean(dossie.dados.ia_situacao_analise) ||
      Boolean(dossie.dados.ia_pecas_danificadas?.length);
    if (!tem) return null;
    return <BlocoLeilao d={dossie.dados} />;
  }
  if (dossie.tipo === "sinistro") {
    return <BlocoSinistro registro={dossie.dados.registro} />;
  }
  if (dossie.tipo === "roubo_furto") {
    return <BlocoRoubo d={dossie.dados} />;
  }
  if (dossie.tipo === "gravame") {
    return <BlocoGravame d={dossie.dados} />;
  }
  if (dossie.tipo === "renainf") {
    return <BlocoRenainf d={dossie.dados} />;
  }
  return null;
}

export function blocoPremiumItem(
  dadosLeilao: unknown,
  tipo: TipoConsultaRiscoPremium
): Record<string, unknown> | null {
  const root = rec(dadosLeilao);
  if (!root) return null;
  const block = rec(root.consultas_premium);
  if (!block) return null;
  return rec(block[tipo]);
}
