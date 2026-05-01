"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Calendar,
  Car,
  DollarSign,
  FlaskConical,
  Fuel,
  Hash,
  Loader2,
  Palette,
  Search,
  Sparkles,
} from "lucide-react";
import {
  getEstadoAcessoAction,
  type EstadoAcessoCliente,
  type StatusAssinaturaUi,
} from "@/actions/acesso-actions";
import { comprarCreditosPremiumAction } from "@/actions/comprar-creditos-actions";
import { mockAdicionarSaldo } from "@/actions/teste-financeiro-actions";
import {
  buscarVeiculoAction,
  type BuscarVeiculoResult,
} from "@/actions/veiculo-actions";
import { FormularioViabilidade } from "@/components/FormularioViabilidade";
import { ValorProtegidoMesBanner } from "@/components/ValorProtegidoMesBanner";
import { useIdentificadorCliente } from "@/hooks/use-identificador-cliente";
import { isPublicDemoMocksMode } from "@/lib/demo-mocks";
import {
  isPlacaVeiculoDemonstracao,
  isResultadoVeiculoModoDemonstracao,
} from "@/lib/placa-teste-demo";
import { formatarMoedaBRLExibicao } from "@/lib/formato-moeda-exibicao";
import { labelPlanoFromSlug } from "@/lib/planos-marketing";

function consultaEhHoje(iso: string): boolean {
  const d = new Date(iso);
  const hoje = new Date();
  return (
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate()
  );
}

function formatarDataConsulta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function labelStatusAssinatura(s: StatusAssinaturaUi): string {
  switch (s) {
    case "ativo":
      return "Ativa";
    case "pendente":
      return "Pendente";
    case "expirado":
      return "Expirada";
    case "cancelado":
      return "Cancelada";
    default:
      return "—";
  }
}

export function BuscaPlaca() {
  const { identificador, pronto: sessaoPronta } = useIdentificadorCliente();
  const [placa, setPlaca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<BuscarVeiculoResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [estadoAcesso, setEstadoAcesso] = useState<EstadoAcessoCliente | null>(
    null
  );
  const [carregandoAcesso, setCarregandoAcesso] = useState(true);
  const [tickValorProtegidoMes, setTickValorProtegidoMes] = useState(0);
  const [msgCompraCreditos, setMsgCompraCreditos] = useState<string | null>(
    null
  );
  const [msgSaldoPrePago, setMsgSaldoPrePago] = useState<string | null>(null);
  const [isComprandoCreditos, startComprarCreditos] = useTransition();
  const [isAdicionandoSaldoMock, startAdicionarSaldoMock] = useTransition();

  const aplicarEstadoAcesso = useCallback((s: EstadoAcessoCliente) => {
    setEstadoAcesso(s);
    setCarregandoAcesso(false);
  }, []);

  const recarregarEstadoAcesso = useCallback(async () => {
    if (!identificador.trim()) return;
    const s = await getEstadoAcessoAction(identificador);
    aplicarEstadoAcesso(s);
  }, [identificador, aplicarEstadoAcesso]);

  useEffect(() => {
    if (!sessaoPronta) return;
    let cancelado = false;
    void (async () => {
      if (!identificador.trim()) {
        const s = await getEstadoAcessoAction("");
        if (!cancelado) aplicarEstadoAcesso(s);
        return;
      }
      const s = await getEstadoAcessoAction(identificador);
      if (!cancelado) aplicarEstadoAcesso(s);
    })();
    return () => {
      cancelado = true;
    };
  }, [sessaoPronta, identificador, aplicarEstadoAcesso]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setResultado(null);

    if (!estadoAcesso?.planoAtivo) {
      setErro(
        "Acesso exclusivo para assinantes Avaliador PRO. Assine um plano para analisar veículos."
      );
      return;
    }

    if (!identificador.trim() && !isPublicDemoMocksMode()) {
      setErro("Sessão inválida. Faça login novamente.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await buscarVeiculoAction(placa, identificador);
        if (!res.sucesso) {
          setErro(res.erro);
          return;
        }
        await recarregarEstadoAcesso();
        setResultado(res);
        setTickValorProtegidoMes((t) => t + 1);
      } catch {
        setErro("Não foi possível concluir a análise. Tente novamente.");
      }
    });
  }

  const planoBloqueado =
    sessaoPronta &&
    !carregandoAcesso &&
    estadoAcesso !== null &&
    !estadoAcesso.planoAtivo;

  if (!sessaoPronta) {
    return (
      <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 text-center text-slate-500">
        <Loader2 className="size-8 animate-spin text-indigo-500" aria-hidden />
        <p className="text-sm">Carregando sessão…</p>
      </div>
    );
  }

  return (
    <div className="relative w-full space-y-10">
      {estadoAcesso?.planoAtivo ? (
        <div
          className="flex justify-center sm:justify-start"
          data-testid="badge-plano-ativo"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/90 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-900 shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
            Plano{" "}
            {estadoAcesso.planoSlug
              ? labelPlanoFromSlug(estadoAcesso.planoSlug) ?? "ativo"
              : "Profissional"}{" "}
            ativo
          </span>
        </div>
      ) : null}

      {estadoAcesso?.planoAtivo && identificador.trim() ? (
        <div
          className="rounded-2xl border border-slate-200/90 bg-slate-50/90 p-4 text-center shadow-sm sm:p-5 sm:text-left"
          data-testid="dashboard-cotas-usuario"
        >
          <p className="text-sm font-semibold leading-relaxed text-slate-800">
            {estadoAcesso.consultasFipeRestantes > 0 ? (
              <>
                Você ainda pode consultar{" "}
                <span className="tabular-nums text-indigo-700">
                  {estadoAcesso.consultasFipeRestantes}
                </span>{" "}
                {estadoAcesso.consultasFipeRestantes === 1
                  ? "veículo"
                  : "veículos"}{" "}
                neste mês com a cota inclusa
              </>
            ) : estadoAcesso.consultasFipeLimite > 0 ? (
              <>
                Cota inclusa de consultas FIPE esgotada neste mês. Consultas extras
                debitam o seu{" "}
                <span className="text-indigo-800">saldo pré-pago</span> (valor por
                consulta conforme o plano).
              </>
            ) : (
              <>Consultas FIPE conforme regras do seu plano.</>
            )}
            {estadoAcesso.consultasFipeLimite > 0 ? (
              <span className="block text-xs font-normal text-slate-500 sm:inline sm:ml-1">
                (cota: {estadoAcesso.consultasFipeUsadas}/
                {estadoAcesso.consultasFipeLimite} usadas · mês{" "}
                {estadoAcesso.fipeMesReferencia} UTC)
              </span>
            ) : null}
            .
          </p>
          {estadoAcesso.consultasFipeExcedentes > 0 ||
          estadoAcesso.valorTotalExcedenteReais > 0 ? (
            <p className="mt-2 text-sm font-medium text-slate-700">
              Consultas extras (pré-pago) neste mês:{" "}
              <span className="tabular-nums text-indigo-800">
                {estadoAcesso.consultasFipeExcedentes}
              </span>
              {" · "}total debitado{" "}
              <span className="tabular-nums text-indigo-800">
                {formatarMoedaBRLExibicao(estadoAcesso.valorTotalExcedenteReais)}
              </span>
            </p>
          ) : null}
          <p
            className="mt-2 text-sm font-semibold leading-relaxed text-slate-800"
            data-testid="saldo-pre-pago-fipe"
          >
            Saldo pré-pago (FIPE) disponível:{" "}
            <span className="tabular-nums text-indigo-700">
              {formatarMoedaBRLExibicao(estadoAcesso.saldoPrePagoReais)}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              href="/creditos"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-indigo-200 bg-white px-4 text-sm font-bold text-indigo-800 shadow-sm transition hover:bg-indigo-50"
              data-testid="link-adicionar-saldo-fipe"
            >
              Adicionar saldo
            </Link>
            {isPublicDemoMocksMode() && identificador.trim() ? (
              <button
                type="button"
                disabled={isAdicionandoSaldoMock}
                onClick={() => {
                  setMsgSaldoPrePago(null);
                  startAdicionarSaldoMock(async () => {
                    const r = await mockAdicionarSaldo(50);
                    if (r.ok) {
                      await recarregarEstadoAcesso();
                      setMsgSaldoPrePago(
                        `Saldo de teste: ${formatarMoedaBRLExibicao(r.data.saldoPrePago)}.`
                      );
                    } else {
                      setMsgSaldoPrePago(r.erro);
                    }
                  });
                }}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-200 px-4 text-xs font-bold uppercase tracking-wide text-slate-800 transition hover:bg-slate-300 disabled:opacity-60"
              >
                {isAdicionandoSaldoMock ? "…" : "Sandbox +R$50"}
              </button>
            ) : null}
          </div>
          {msgSaldoPrePago ? (
            <p
              role="status"
              className="mt-2 text-xs font-medium text-slate-600"
            >
              {msgSaldoPrePago}
            </p>
          ) : null}
          {estadoAcesso.dataExpiracaoAssinaturaIso ? (
            <p className="mt-2 text-xs font-medium text-slate-600">
              Assinatura:{" "}
              <span className="text-slate-800">
                {labelStatusAssinatura(estadoAcesso.statusAssinatura)}
              </span>
              {" · "}
              válida até{" "}
              <span className="tabular-nums text-slate-800">
                {formatarDataConsulta(estadoAcesso.dataExpiracaoAssinaturaIso)}
              </span>
            </p>
          ) : null}
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800">
            Você possui{" "}
            <span className="tabular-nums text-indigo-700">
              {estadoAcesso.creditosPremium}
            </span>{" "}
            {estadoAcesso.creditosPremium === 1
              ? "crédito de blindagem"
              : "créditos de blindagem"}
            .
          </p>
          <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            {estadoAcesso.compraCreditosDiretaHabilitada ? (
              <button
                type="button"
                disabled={isComprandoCreditos}
                onClick={() => {
                  setMsgCompraCreditos(null);
                  startComprarCreditos(async () => {
                    const r = await comprarCreditosPremiumAction(
                      identificador,
                      1
                    );
                    if (r.ok) {
                      await recarregarEstadoAcesso();
                      setMsgCompraCreditos("Crédito adicionado ao seu saldo.");
                    } else {
                      setMsgCompraCreditos(r.erro);
                    }
                  });
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60"
                data-testid="btn-comprar-creditos"
              >
                {isComprandoCreditos ? "Processando…" : "Comprar mais créditos"}
              </button>
            ) : (
              <Link
                href="/creditos"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-indigo-200 bg-white px-5 text-sm font-bold text-indigo-800 shadow-sm transition hover:bg-indigo-50"
                data-testid="link-creditos-planos"
              >
                Ver planos e créditos
              </Link>
            )}
          </div>
          {msgCompraCreditos ? (
            <p
              role="status"
              className="mt-3 text-center text-xs font-medium text-slate-600 sm:text-left"
            >
              {msgCompraCreditos}
            </p>
          ) : null}
        </div>
      ) : null}

      {planoBloqueado ? (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 rounded-3xl bg-white/95 p-8 text-center shadow-inner backdrop-blur-sm"
          data-testid="overlay-acesso-plano"
        >
          <p className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Acesso exclusivo para assinantes Avaliador PRO
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-slate-600">
            Esta é uma ferramenta profissional para decisão de compra de veículos.
          </p>
          <Link
            href="/#planos"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Assinar plano
          </Link>
        </div>
      ) : null}

      <div className={planoBloqueado ? "pointer-events-none select-none opacity-40" : undefined}>
        <div className="space-y-2 text-center sm:text-left">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Análise por placa
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
            Formato Mercosul ou antigo. As bases só são consultadas ao clicar em{" "}
            <span className="font-semibold text-slate-800">Analisar veículo</span> — nada é
            chamado automaticamente enquanto você digita.
          </p>
        </div>

        {estadoAcesso?.planoAtivo && identificador.trim() ? (
          <ValorProtegidoMesBanner
            identificadorCliente={identificador}
            planoAtivo={estadoAcesso.planoAtivo}
            versaoAtualizacao={tickValorProtegidoMes}
          />
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-6 rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 p-6 shadow-xl shadow-slate-200/40 sm:p-8"
          noValidate
        >
          <div className="space-y-3">
            <label
              htmlFor="placa"
              className="block text-sm font-semibold text-slate-700"
            >
              Placa do veículo
            </label>
            <div className="group relative">
              <div
                className="pointer-events-none absolute left-5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100 transition group-focus-within:bg-indigo-100 group-focus-within:ring-indigo-200"
                aria-hidden
              >
                <Search className="size-[1.35rem]" strokeWidth={2} />
              </div>
              <input
                id="placa"
                name="placa"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="ABC1D23"
                suppressHydrationWarning
                value={placa}
                onChange={(e) =>
                  setPlaca(
                    e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7)
                  )
                }
                disabled={isPending || planoBloqueado || carregandoAcesso}
                data-testid="input-placa"
                className="w-full rounded-2xl border-2 border-slate-200/90 bg-white py-5 pl-[4.25rem] pr-5 font-mono text-xl font-bold uppercase tracking-[0.35em] text-slate-900 shadow-inner shadow-slate-100 placeholder:text-center placeholder:tracking-[0.35em] placeholder:text-slate-300 outline-none transition-all duration-200 placeholder:sm:text-left focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)] focus:ring-0 disabled:cursor-not-allowed disabled:opacity-55 sm:text-2xl sm:tracking-[0.4em]"
                maxLength={7}
              />
            </div>
            <p className="text-center text-xs text-slate-500 sm:text-left">
              <span className="font-mono font-medium text-slate-600">ABC1234</span>
              {" · "}
              <span className="font-mono font-medium text-slate-600">ABC1D23</span>
              <span className="hidden sm:inline"> · 7 caracteres</span>
            </p>
          </div>

          {erro ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-200/90 bg-red-50/90 px-5 py-4 text-sm font-medium leading-relaxed text-red-900 shadow-sm"
              data-testid="erro-busca-placa"
            >
              {erro}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending || planoBloqueado || carregandoAcesso}
            data-testid="btn-buscar-placa"
            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-700 px-6 py-4 text-base font-semibold text-white shadow-xl shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-indigo-500/35 active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:from-slate-400 disabled:via-slate-400 disabled:to-slate-400 disabled:shadow-none"
          >
            <span
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-disabled:opacity-0"
              aria-hidden
            />
            {isPending || carregandoAcesso ? (
              <>
                <Loader2
                  className="relative size-5 shrink-0 animate-spin text-white/95 [animation-duration:850ms]"
                  strokeWidth={2}
                />
                <span className="relative">
                  {carregandoAcesso ? "Verificando acesso…" : "Analisando…"}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="relative size-5 shrink-0 opacity-90" />
                <span className="relative">Analisar veículo</span>
              </>
            )}
          </button>
        </form>

        {resultado?.sucesso ? (
          <section
            className="mt-10 space-y-5"
            aria-live="polite"
            data-testid="resultado-busca-placa"
          >
            {resultado.sandboxAtivo ? (
              <div
                className="flex items-center justify-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-2.5 text-center shadow-sm"
                role="status"
                data-testid="badge-sandbox-ativo"
              >
                <FlaskConical
                  className="size-4 shrink-0 text-amber-700"
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-900">
                  MODO SANDBOX ATIVO
                </span>
              </div>
            ) : null}

            {isResultadoVeiculoModoDemonstracao(
              resultado.sandboxAtivo,
              resultado.placa
            ) ? (
              <div
                className="flex justify-center sm:justify-start"
                data-testid="badge-veiculo-teste"
              >
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-violet-400/70 bg-gradient-to-r from-amber-100 via-violet-100 to-amber-50 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-violet-950 shadow-md shadow-violet-200/50 ring-1 ring-amber-200/60"
                  role="status"
                >
                  <FlaskConical
                    className="size-3.5 shrink-0 text-violet-700"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  VEÍCULO DE TESTE
                </span>
              </div>
            ) : null}

            {resultado.avisoConsultaFipeExcedente ? (
              <div
                className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-5 py-4 text-sm font-medium text-amber-950 shadow-sm"
                role="status"
                data-testid="aviso-fipe-excedente"
              >
                {resultado.avisoConsultaFipeExcedente}
              </div>
            ) : null}

            <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  Resumo da consulta
                </h3>
                {isResultadoVeiculoModoDemonstracao(
                  resultado.sandboxAtivo,
                  resultado.placa
                ) ? (
                  <p
                    className="text-xs font-semibold text-violet-800"
                    data-testid="label-fonte-sandbox-simulacao"
                  >
                    Fonte: Sandbox / Simulação
                  </p>
                ) : null}
              </div>
              <span
                className="inline-flex w-fit max-w-full items-center gap-2 self-end rounded-full border border-indigo-200/80 bg-indigo-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-indigo-900 shadow-sm sm:self-auto sm:shrink-0"
                data-testid="badge-data-consulta"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden />
                <span className="line-clamp-2 text-left normal-case tracking-normal">
                  {resultado.fipe !== "—" && resultado.mesReferenciaFipe
                    ? `Referência de mercado · ${resultado.mesReferenciaFipe}`
                    : consultaEhHoje(resultado.consultadoEm)
                      ? "Análise atualizada hoje"
                      : `Análise em ${formatarDataConsulta(resultado.consultadoEm)}`}
                </span>
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-200/30 transition hover:shadow-xl hover:shadow-slate-200/40">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
                  <Car className="size-6" strokeWidth={2} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Identificação
                </p>
                <p className="mt-2 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
                  {resultado.marca}
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-slate-600 sm:text-base">
                  {resultado.modelo}
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-200/30 transition hover:shadow-xl hover:shadow-slate-200/40">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
                  <Calendar className="size-6" strokeWidth={2} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Ano modelo
                </p>
                <p className="mt-3 font-mono text-4xl font-bold tabular-nums tracking-tight text-slate-900">
                  {resultado.ano}
                </p>
                <p className="mt-auto pt-4 text-xs text-slate-500">
                  Referência para cálculo de viabilidade
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 shadow-md shadow-slate-200/25">
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200/80">
                  <Hash className="size-5" strokeWidth={2} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Chassi
                </p>
                <p className="mt-2 break-all font-mono text-xs font-semibold leading-snug text-slate-800">
                  {resultado.chassi}
                </p>
              </div>
              <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 shadow-md shadow-slate-200/25">
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200/80">
                  <Palette className="size-5" strokeWidth={2} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Cor
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {resultado.cor}
                </p>
              </div>
              <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 shadow-md shadow-slate-200/25 sm:col-span-1">
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200/80">
                  <Fuel className="size-5" strokeWidth={2} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Combustível
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {resultado.combustivel}
                </p>
              </div>
            </div>

            {resultado.avisoFipe ? (
              <div
                className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-5 py-4 text-sm font-medium text-amber-950 shadow-sm"
                role="status"
                data-testid="aviso-fipe-indisponivel"
              >
                {resultado.avisoFipe}
              </div>
            ) : null}

            <div className="relative overflow-hidden rounded-3xl border border-indigo-950/20 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950 p-8 shadow-2xl shadow-indigo-950/40 sm:p-10">
              <div
                className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-indigo-500/25 blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-20 left-1/4 size-48 rounded-full bg-violet-500/15 blur-3xl"
                aria-hidden
              />

              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-sm">
                  <DollarSign className="size-7" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-indigo-200/90">
                    Referência de mercado
                  </p>
                  <p
                    className={`mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl ${
                      resultado.fipe === "—" ? "text-indigo-200/70" : "text-white"
                    }`}
                  >
                    {resultado.fipe === "—" ? (
                      <span className="block text-left text-xl font-bold leading-snug text-indigo-100/90 sm:text-2xl lg:text-3xl">
                        Referência não disponível para esta combinação de versão e dados.
                      </span>
                    ) : (
                      resultado.fipe
                    )}
                  </p>
                  <p className="mt-5 max-w-xl text-sm leading-relaxed text-indigo-100/85">
                    {resultado.fipe === "—"
                      ? "Verifique o aviso acima. A resolução FIPE depende de marca, modelo, ano e combustível retornados pela consulta."
                      : "Valor indicativo para análise de margem. Cruze com custos de pátio, reparo e política comercial antes de fechar negócio."}
                  </p>
                </div>
              </div>
            </div>

            <FormularioViabilidade
              key={resultado.placa}
              placa={resultado.placa}
              fipeReferenciaTexto={resultado.fipe}
              simulacaoJson={resultado.simulacaoViabilidade}
              dadosLeilaoJson={resultado.dadosLeilao}
              identificadorCliente={identificador}
              creditosPremium={estadoAcesso?.creditosPremium ?? 0}
              planoAtivo={estadoAcesso?.planoAtivo ?? false}
              relatorioVeiculo={{
                modelo: resultado.modelo,
                ano: resultado.ano,
                marca: resultado.marca,
                consultadoEmIso: resultado.consultadoEm,
                relatorioDemonstracao:
                  resultado.sandboxAtivo ||
                  isPlacaVeiculoDemonstracao(resultado.placa),
              }}
              onDadosLeilaoAtualizado={(dadosLeilao) => {
                setResultado((prev) =>
                  prev?.sucesso ? { ...prev, dadosLeilao } : prev
                );
                void recarregarEstadoAcesso();
                setTickValorProtegidoMes((t) => t + 1);
              }}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
