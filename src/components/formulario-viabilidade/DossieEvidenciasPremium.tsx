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
              </li>
            ))}
          </ul>
        </div>
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
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BlocoGravame({ d }: { d: GravameDossie }) {
  const cnpj = d.agente_financeiro_cnpj?.trim();
  if (
    !d.agente_financeiro_nome &&
    !cnpj &&
    !d.data_registro &&
    !d.situacao
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
    const tem =
      dossie.dados.registros.length > 0 ||
      dossie.dados.ia_danos.length > 0 ||
      (!omitirImg && dossie.dados.fotos_remarketing.length > 0) ||
      Boolean(dossie.dados.classificacao_letra) ||
      Boolean(dossie.dados.classificacao_descricao);
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
