"use server";

import { randomUUID } from "crypto";

import { supabaseAdmin } from "@/lib/supabase";
import {
  cachePremiumConsultaFresco,
  corpoRespostaMinimoValido,
  estruturaMinimaPorTipo,
  fetchConsultarPlacaPremiumV2,
  isSandboxMocksPremiumEnabled,
  mockConsultarRiscoApiDeterministico,
  normalizarConsultaPremiumV2,
  withBlindagemCompletaDedupe,
  withPremiumConsultaDedupe,
} from "@/lib/consultar-placa-premium-v2";
import { dispararPersistirEventoConsultaAuditoriaDb } from "@/lib/consulta-audit-supabase";
import {
  blindagemCompletaJaAtiva,
  consultaPremiumTipoFrescaNoBloco,
  TIPOS_CONSULTA_RISCO_PREMIUM,
  type ResultadoConsultaRiscoCarregado,
  type TipoConsultaRiscoPremium,
} from "@/lib/consultas-risco-premium";
import {
  dossieFromStoredBlock,
  extrairDossieConsultaPremium,
  renainfDossieParaJson,
  serializarDossieParaPersistencia,
} from "@/lib/api-v2/parsers";
import { MOCK_DEMO_USER_ID, isPublicDemoMocksMode } from "@/lib/demo-mocks";
import {
  getCustoUnitarioPremiumReais,
  registrarEventoAuditoriaConsulta,
} from "@/lib/consulta-audit-log";
import { isPremiumApiKillSwitchActive } from "@/lib/premium-kill-switch";
import { registrarTentativaConsultaPremium } from "@/lib/premium-security";
import {
  carregarUsuarioAcesso,
  debitarCreditoPremium,
  MSG_SEM_CREDITOS_PREMIUM,
  MSG_SEM_PLANO,
} from "@/lib/usuario-acesso";
import { placaSchema } from "@/lib/validations";
import { calcularValorEvitarPerdaReais } from "@/lib/valor-evitar-perda";

const MSG_KILL_SWITCH_PREMIUM =
  "Consultas premium temporariamente suspensas pelo sistema. Tente novamente mais tarde.";

/** Mantém `evidencias_renainf` alinhado ao bloco `consultas_premium.renainf` (legado / PDF). */
function sincronizarEvidenciasRenainfDePremium(root: Record<string, unknown>) {
  const block = root.consultas_premium;
  if (!block || typeof block !== "object" || Array.isArray(block)) return;
  const br = (block as Record<string, unknown>).renainf;
  if (!br || typeof br !== "object" || Array.isArray(br)) return;
  const dr = dossieFromStoredBlock(
    (br as Record<string, unknown>).dossie
  );
  if (dr?.tipo === "renainf" && dr.dados.infracoes.length > 0) {
    root.evidencias_renainf = renainfDossieParaJson(dr.dados);
  }
}

function isTipoConsultaRisco(s: string): s is TipoConsultaRiscoPremium {
  return (TIPOS_CONSULTA_RISCO_PREMIUM as readonly string[]).includes(s);
}

function tiposRiscoConstatadosPremium(block: Record<string, unknown>): string {
  const out: string[] = [];
  for (const t of TIPOS_CONSULTA_RISCO_PREMIUM) {
    const ex = block[t];
    if (
      ex &&
      typeof ex === "object" &&
      !Array.isArray(ex) &&
      (ex as Record<string, unknown>).constatado === true
    ) {
      out.push(t);
    }
  }
  return out.length ? out.join(",") : "nenhum_constatado";
}

export type ConsultarRiscoPremiumOk = {
  sucesso: true;
  tipo: TipoConsultaRiscoPremium;
  resultado: ResultadoConsultaRiscoCarregado;
  dadosLeilao: Record<string, unknown>;
  /**
   * Igual ao `valor_evitar_perda` em `CREDITO_CONSUMIDO` quando houve débito;
   * null em cache hit, mock sem débito ou FIPE inválida.
   */
  valorEvitarPerdaReais: number | null;
};

export async function consultarRiscoPremiumAction(
  placa: string,
  tipo: string,
  identificadorCliente: string
): Promise<ConsultarRiscoPremiumOk | { sucesso: false; erro: string }> {
  const parsedPlaca = placaSchema.safeParse(placa);
  if (!parsedPlaca.success) {
    const msg =
      parsedPlaca.error.issues[0]?.message ?? "Não foi possível validar a placa.";
    return { sucesso: false, erro: msg };
  }
  if (!isTipoConsultaRisco(tipo)) {
    return { sucesso: false, erro: "Tipo de análise inválido." };
  }

  const idCliente =
    (identificadorCliente ?? "").trim() ||
    (isPublicDemoMocksMode() ? MOCK_DEMO_USER_ID : "");
  if (!idCliente) {
    return { sucesso: false, erro: "Sessão não identificada." };
  }

  const usuario = await carregarUsuarioAcesso(idCliente);
  if (!usuario?.plano_ativo) {
    return { sucesso: false, erro: MSG_SEM_PLANO };
  }

  const placaNorm = parsedPlaca.data;
  const tipoOk = tipo;

  try {
    const { data: row, error: readError } = await supabaseAdmin
      .from("consultas_veiculos")
      .select("placa, dados_leilao, fipe, simulacao_viabilidade")
      .eq("placa", placaNorm)
      .maybeSingle();

    if (readError) {
      console.error("[consultas_risco] leitura", readError);
      return {
        sucesso: false,
        erro: "Não foi possível carregar a análise desta placa.",
      };
    }
    if (!row) {
      return {
        sucesso: false,
        erro: "Analise o veículo pela placa antes de contratar análises premium.",
      };
    }

    const prevRoot = (row.dados_leilao ?? {}) as Record<string, unknown>;
    const prevPremium = prevRoot.consultas_premium;
    const block =
      prevPremium && typeof prevPremium === "object" && !Array.isArray(prevPremium)
        ? { ...(prevPremium as Record<string, unknown>) }
        : {};

    const existente = block[tipoOk];
    if (existente && typeof existente === "object" && !Array.isArray(existente)) {
      const ex = existente as Record<string, unknown>;
      const em =
        typeof ex.consultado_em === "string"
          ? ex.consultado_em
          : typeof ex.consultadoEm === "string"
            ? ex.consultadoEm
            : "";
      if (
        em &&
        typeof ex.resumo === "string" &&
        cachePremiumConsultaFresco(em)
      ) {
        console.info(`[CACHE_HIT] tipo=${tipoOk} placa=${placaNorm}`);
        dispararPersistirEventoConsultaAuditoriaDb({
          clienteId: idCliente,
          placa: placaNorm,
          evento: "CACHE_HIT",
          tipoConsulta: tipoOk,
          detalhe: "consulta_premium_cache_fresco",
        });
        registrarEventoAuditoriaConsulta({
          usuarioId: idCliente,
          placa: placaNorm,
          custoRealReais: 0,
          statusDebito: "nao_aplicavel_cache",
          tipo: "uso_cache_premium",
          detalhe: tipoOk,
        });
        const resultado: ResultadoConsultaRiscoCarregado = {
          consultadoEm: em,
          constatado: Boolean(ex.constatado),
          resumo: ex.resumo,
        };
        return {
          sucesso: true,
          tipo: tipoOk,
          resultado,
          dadosLeilao: prevRoot,
          valorEvitarPerdaReais: null,
        };
      }
    }

    const usarMock = isSandboxMocksPremiumEnabled();
    if (!usarMock && isPremiumApiKillSwitchActive()) {
      return { sucesso: false, erro: MSG_KILL_SWITCH_PREMIUM };
    }
    if (!usarMock) {
      const sec = registrarTentativaConsultaPremium(idCliente, placaNorm);
      if (!sec.ok) {
        return { sucesso: false, erro: sec.motivo };
      }
    }
    if (!usarMock && usuario.creditos_premium < 1) {
      return { sucesso: false, erro: MSG_SEM_CREDITOS_PREMIUM };
    }

    return withPremiumConsultaDedupe(placaNorm, tipoOk, idCliente, async () => {
      const requestIdOperacao = randomUUID();
      console.info(`[CONSULTA_INICIO] tipo=${tipoOk} placa=${placaNorm}`);
      dispararPersistirEventoConsultaAuditoriaDb({
        clienteId: idCliente,
        placa: placaNorm,
        evento: "CONSULTA_INICIO",
        tipoConsulta: tipoOk,
        requestId: requestIdOperacao,
      });
      const consultadoEm = new Date().toISOString();

      if (usarMock) {
        const { constatado, resumo } = mockConsultarRiscoApiDeterministico(
          placaNorm,
          tipoOk
        );
        block[tipoOk] = {
          constatado,
          resumo,
          consultado_em: consultadoEm,
          fonte: "api_premium_mock",
        };
        const dadosLeilao: Record<string, unknown> = {
          ...prevRoot,
          consultas_premium: block,
        };
        sincronizarEvidenciasRenainfDePremium(dadosLeilao);
        const { error: writeError } = await supabaseAdmin
          .from("consultas_veiculos")
          .update({ dados_leilao: dadosLeilao })
          .eq("placa", placaNorm);
        if (writeError) {
          console.error("[consultas_risco] update (mock)", writeError);
          console.info(
            `[CONSULTA_ERRO] tipo=${tipoOk} placa=${placaNorm} motivo=persistencia_mock`
          );
          return {
            sucesso: false,
            erro: "Não foi possível salvar o resultado da análise.",
          };
        }
        console.info(
          `[CONSULTA_SUCESSO] tipo=${tipoOk} placa=${placaNorm} modo=mock sem_debito`
        );
        registrarEventoAuditoriaConsulta({
          usuarioId: idCliente,
          placa: placaNorm,
          custoRealReais: 0,
          statusDebito: "nao_aplicavel_mock",
          tipo: "consulta_premium_api",
          detalhe: `mock tipo=${tipoOk}`,
        });
        const salvoMock = block[tipoOk] as Record<string, unknown>;
        const valorRoiMock = calcularValorEvitarPerdaReais({
          fipeTexto: typeof row.fipe === "string" ? row.fipe : "—",
          dadosLeilao,
          simulacaoViabilidade: row.simulacao_viabilidade,
        });
        return {
          sucesso: true,
          tipo: tipoOk,
          resultado: {
            consultadoEm,
            constatado: Boolean(salvoMock.constatado),
            resumo:
              typeof salvoMock.resumo === "string"
                ? salvoMock.resumo
                : String(salvoMock.resumo ?? ""),
          },
          dadosLeilao,
          valorEvitarPerdaReais: valorRoiMock,
        };
      }

      const fetchResult = await fetchConsultarPlacaPremiumV2(tipoOk, placaNorm);

      if (!fetchResult.ok) {
        if (fetchResult.tipoErro === "timeout") {
          console.info(`[TIMEOUT] tipo=${tipoOk} placa=${placaNorm}`);
          console.info(`[CONSULTA_TIMEOUT] tipo=${tipoOk} placa=${placaNorm}`);
          dispararPersistirEventoConsultaAuditoriaDb({
            clienteId: idCliente,
            placa: placaNorm,
            evento: "CONSULTA_TIMEOUT",
            tipoConsulta: tipoOk,
            detalhe: fetchResult.mensagem,
            requestId: requestIdOperacao,
          });
        } else {
          dispararPersistirEventoConsultaAuditoriaDb({
            clienteId: idCliente,
            placa: placaNorm,
            evento: "CONSULTA_ERRO",
            tipoConsulta: tipoOk,
            detalhe: `${fetchResult.tipoErro}: ${fetchResult.mensagem}`,
            requestId: requestIdOperacao,
          });
        }
        console.info(
          `[CONSULTA_ERRO] tipo=${tipoOk} placa=${placaNorm} motivo=${fetchResult.tipoErro} detalhe=${fetchResult.mensagem}`
        );
        return {
          sucesso: false,
          erro:
            fetchResult.tipoErro === "timeout"
              ? "A consulta demorou além do limite. Tente novamente em instantes."
              : fetchResult.mensagem,
        };
      }

      const json = fetchResult.json;
      if (!corpoRespostaMinimoValido(json)) {
        console.info(
          `[CONSULTA_ERRO] tipo=${tipoOk} placa=${placaNorm} motivo=resposta_invalida status!=ok_ou_sem_dados`
        );
        dispararPersistirEventoConsultaAuditoriaDb({
          clienteId: idCliente,
          placa: placaNorm,
          evento: "CONSULTA_ERRO",
          tipoConsulta: tipoOk,
          detalhe: "resposta_invalida",
          requestId: requestIdOperacao,
        });
        return {
          sucesso: false,
          erro: "Resposta da consulta premium em formato inesperado.",
        };
      }

      const dados = json.dados as Record<string, unknown>;
      if (!estruturaMinimaPorTipo(tipoOk, dados)) {
        console.info(
          `[CONSULTA_ERRO] tipo=${tipoOk} placa=${placaNorm} motivo=estrutura_minima`
        );
        dispararPersistirEventoConsultaAuditoriaDb({
          clienteId: idCliente,
          placa: placaNorm,
          evento: "CONSULTA_ERRO",
          tipoConsulta: tipoOk,
          detalhe: "estrutura_minima",
          requestId: requestIdOperacao,
        });
        return {
          sucesso: false,
          erro: "Dados da consulta incompletos. Tente novamente mais tarde.",
        };
      }

      const normBody = json as Parameters<typeof normalizarConsultaPremiumV2>[1];
      const { constatado, resumo } = normalizarConsultaPremiumV2(tipoOk, normBody);

      const dossieConsulta = extrairDossieConsultaPremium(tipoOk, dados);
      const dossiePersist = dossieConsulta
        ? serializarDossieParaPersistencia(tipoOk, dossieConsulta)
        : null;

      block[tipoOk] = {
        constatado,
        resumo,
        consultado_em: consultadoEm,
        fonte: "consultar_placa_v2",
        ...(dossiePersist ? { dossie: dossiePersist } : {}),
      };

      const dadosLeilao: Record<string, unknown> = {
        ...prevRoot,
        consultas_premium: block,
      };
      sincronizarEvidenciasRenainfDePremium(dadosLeilao);

      const valorEvitarPerda = calcularValorEvitarPerdaReais({
        fipeTexto: typeof row.fipe === "string" ? row.fipe : "—",
        dadosLeilao,
        simulacaoViabilidade: row.simulacao_viabilidade,
      });

      const debitou = await debitarCreditoPremium(idCliente);
      if (!debitou) {
        console.error(
          "[INCONSISTENCIA_FINANCEIRA] api_consultar_placa_v2_ok mas debito_credito_premium_falhou",
          {
            placa: placaNorm,
            tipo: tipoOk,
            usuario: idCliente,
            etapa: "pos_api_pre_persistencia",
          }
        );
        return {
          sucesso: false,
          erro:
            "Não foi possível registrar o uso do crédito após a consulta. Nenhuma cobrança foi salva — contate o suporte se o problema persistir.",
        };
      }

      const uAposDebito = await carregarUsuarioAcesso(idCliente);
      const saldo = uAposDebito?.creditos_premium ?? 0;
      console.info(
        `[CREDIT_DEBIT] Usuario ${idCliente} - Serviço: ${tipoOk} - Saldo Restante: ${saldo}`
      );

      const { error: writeError } = await supabaseAdmin
        .from("consultas_veiculos")
        .update({ dados_leilao: dadosLeilao })
        .eq("placa", placaNorm);

      if (writeError) {
        console.error(
          "[INCONSISTENCIA_FINANCEIRA] api_ok debito_ok persistencia_falhou",
          {
            placa: placaNorm,
            tipo: tipoOk,
            usuario: idCliente,
            erroSupabase: writeError,
          }
        );
        console.error("[consultas_risco] update", writeError);
        console.info(
          `[CONSULTA_ERRO] tipo=${tipoOk} placa=${placaNorm} motivo=persistencia`
        );
        dispararPersistirEventoConsultaAuditoriaDb({
          clienteId: idCliente,
          placa: placaNorm,
          evento: "CONSULTA_ERRO",
          tipoConsulta: tipoOk,
          detalhe: "persistencia_falhou_apos_debito",
          requestId: requestIdOperacao,
        });
        return {
          sucesso: false,
          erro:
            "Crédito debitado, mas falhou ao salvar o resultado. Contate o suporte com urgência.",
        };
      }

      registrarEventoAuditoriaConsulta({
        usuarioId: idCliente,
        placa: placaNorm,
        custoRealReais: getCustoUnitarioPremiumReais(),
        statusDebito: "debitado_ok",
        tipo: "consulta_premium_api",
        detalhe: tipoOk,
      });

      console.info(`[CONSULTA_SUCESSO] tipo=${tipoOk} placa=${placaNorm}`);
      dispararPersistirEventoConsultaAuditoriaDb({
        clienteId: idCliente,
        placa: placaNorm,
        evento: "CONSULTA_SUCESSO",
        tipoConsulta: tipoOk,
        tipoRiscoDetectado: constatado ? `${tipoOk}_constatado` : `${tipoOk}_limpo`,
        requestId: requestIdOperacao,
      });
      dispararPersistirEventoConsultaAuditoriaDb({
        clienteId: idCliente,
        placa: placaNorm,
        evento: "CREDITO_CONSUMIDO",
        tipoConsulta: tipoOk,
        detalhe: "debito_1_credito_pos_api",
        valorEvitarPerda: valorEvitarPerda ?? undefined,
        tipoRiscoDetectado: constatado ? `${tipoOk}_constatado` : `${tipoOk}_limpo`,
        requestId: requestIdOperacao,
      });

      return {
        sucesso: true,
        tipo: tipoOk,
        resultado: {
          consultadoEm,
          constatado,
          resumo,
        },
        dadosLeilao,
        valorEvitarPerdaReais: valorEvitarPerda,
      };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.info(`[CONSULTA_ERRO] tipo=${tipoOk} placa=${placaNorm} motivo=excecao ${msg}`);
    return { sucesso: false, erro: msg };
  }
}

export type AtivarBlindagemCompletaResult =
  | {
      sucesso: true;
      dadosLeilao: Record<string, unknown>;
      jaEraAtiva: boolean;
      /** Mesmo valor do `CREDITO_CONSUMIDO` quando houve débito real; senão null. */
      valorEvitarPerdaReais: number | null;
    }
  | { sucesso: false; erro: string };

/**
 * Um crédito libera o pacote completo (Leilão, Sinistro, Roubo/furto, Gravame, Renainf)
 * para esta placa, persistido em `dados_leilao.consultas_premium` — sem nova cobrança após ativado.
 */
export async function ativarBlindagemCompletaAction(
  placa: string,
  identificadorCliente: string
): Promise<AtivarBlindagemCompletaResult> {
  const parsedPlaca = placaSchema.safeParse(placa);
  if (!parsedPlaca.success) {
    const msg =
      parsedPlaca.error.issues[0]?.message ?? "Não foi possível validar a placa.";
    return { sucesso: false, erro: msg };
  }

  const idCliente =
    (identificadorCliente ?? "").trim() ||
    (isPublicDemoMocksMode() ? MOCK_DEMO_USER_ID : "");
  if (!idCliente) {
    return { sucesso: false, erro: "Sessão não identificada." };
  }

  const usuario = await carregarUsuarioAcesso(idCliente);
  if (!usuario?.plano_ativo) {
    return { sucesso: false, erro: MSG_SEM_PLANO };
  }

  const placaNorm = parsedPlaca.data;

  return withBlindagemCompletaDedupe(placaNorm, idCliente, async () => {
    const requestIdBlindagem = randomUUID();
    try {
      const { data: row, error: readError } = await supabaseAdmin
        .from("consultas_veiculos")
        .select("placa, dados_leilao, fipe, simulacao_viabilidade")
        .eq("placa", placaNorm)
        .maybeSingle();

      if (readError) {
        console.error("[blindagem_completa] leitura", readError);
        return {
          sucesso: false,
          erro: "Não foi possível carregar a análise desta placa.",
        };
      }
      if (!row) {
        return {
          sucesso: false,
          erro: "Analise o veículo pela placa antes de ativar a blindagem.",
        };
      }

      const prevRoot = (row.dados_leilao ?? {}) as Record<string, unknown>;
      const prevPremium = prevRoot.consultas_premium;
      const block: Record<string, unknown> =
        prevPremium && typeof prevPremium === "object" && !Array.isArray(prevPremium)
          ? { ...(prevPremium as Record<string, unknown>) }
          : {};

      if (blindagemCompletaJaAtiva({ ...prevRoot, consultas_premium: block })) {
        return {
          sucesso: true,
          dadosLeilao: prevRoot,
          jaEraAtiva: true,
          valorEvitarPerdaReais: null,
        };
      }

      const faltantes = TIPOS_CONSULTA_RISCO_PREMIUM.filter(
        (t) => !consultaPremiumTipoFrescaNoBloco(block, t)
      );

      if (faltantes.length === 0) {
        return {
          sucesso: true,
          dadosLeilao: prevRoot,
          jaEraAtiva: true,
          valorEvitarPerdaReais: null,
        };
      }

      const usarMock = isSandboxMocksPremiumEnabled();
      if (!usarMock && isPremiumApiKillSwitchActive()) {
        return { sucesso: false, erro: MSG_KILL_SWITCH_PREMIUM };
      }
      if (!usarMock && usuario.creditos_premium < 1) {
        return { sucesso: false, erro: MSG_SEM_CREDITOS_PREMIUM };
      }

      if (!usarMock) {
        const secBlind = registrarTentativaConsultaPremium(idCliente, placaNorm);
        if (!secBlind.ok) {
          return { sucesso: false, erro: secBlind.motivo };
        }
        console.info(
          `[CONSULTA_INICIO] blindagem_completa placa=${placaNorm} tipos=${faltantes.join(",")}`
        );
        dispararPersistirEventoConsultaAuditoriaDb({
          clienteId: idCliente,
          placa: placaNorm,
          evento: "CONSULTA_INICIO",
          detalhe: `blindagem_completa faltantes=${faltantes.join(",")}`,
          requestId: requestIdBlindagem,
        });
      }

      const consultadoEm = new Date().toISOString();

      for (const tipoOk of faltantes) {
        if (usarMock) {
          const { constatado, resumo } = mockConsultarRiscoApiDeterministico(
            placaNorm,
            tipoOk
          );
          block[tipoOk] = {
            constatado,
            resumo,
            consultado_em: consultadoEm,
            fonte: "api_premium_mock",
          };
          continue;
        }

        const fetchResult = await fetchConsultarPlacaPremiumV2(tipoOk, placaNorm);

        if (!fetchResult.ok) {
          console.info(
            `[BLINDAGEM_ERRO] tipo=${tipoOk} placa=${placaNorm} motivo=${fetchResult.tipoErro}`
          );
          if (fetchResult.tipoErro === "timeout") {
            dispararPersistirEventoConsultaAuditoriaDb({
              clienteId: idCliente,
              placa: placaNorm,
              evento: "CONSULTA_TIMEOUT",
              tipoConsulta: tipoOk,
              detalhe: fetchResult.mensagem,
              requestId: requestIdBlindagem,
            });
          } else {
            dispararPersistirEventoConsultaAuditoriaDb({
              clienteId: idCliente,
              placa: placaNorm,
              evento: "CONSULTA_ERRO",
              tipoConsulta: tipoOk,
              detalhe: `${fetchResult.tipoErro}: ${fetchResult.mensagem}`,
              requestId: requestIdBlindagem,
            });
          }
          return {
            sucesso: false,
            erro:
              fetchResult.tipoErro === "timeout"
                ? "A consulta premium demorou além do limite. Tente novamente em instantes."
                : fetchResult.mensagem,
          };
        }

        const json = fetchResult.json;
        if (!corpoRespostaMinimoValido(json)) {
          dispararPersistirEventoConsultaAuditoriaDb({
            clienteId: idCliente,
            placa: placaNorm,
            evento: "CONSULTA_ERRO",
            tipoConsulta: tipoOk,
            detalhe: "resposta_invalida_blindagem",
            requestId: requestIdBlindagem,
          });
          return {
            sucesso: false,
            erro: "Resposta da consulta premium em formato inesperado.",
          };
        }

        const dados = json.dados as Record<string, unknown>;
        if (!estruturaMinimaPorTipo(tipoOk, dados)) {
          dispararPersistirEventoConsultaAuditoriaDb({
            clienteId: idCliente,
            placa: placaNorm,
            evento: "CONSULTA_ERRO",
            tipoConsulta: tipoOk,
            detalhe: "estrutura_minima_blindagem",
            requestId: requestIdBlindagem,
          });
          return {
            sucesso: false,
            erro: "Dados da consulta incompletos. Tente novamente mais tarde.",
          };
        }

        const normBody = json as Parameters<
          typeof normalizarConsultaPremiumV2
        >[1];
        const { constatado, resumo } = normalizarConsultaPremiumV2(tipoOk, normBody);

        const dossieConsulta = extrairDossieConsultaPremium(tipoOk, dados);
        const dossiePersist = dossieConsulta
          ? serializarDossieParaPersistencia(tipoOk, dossieConsulta)
          : null;

        block[tipoOk] = {
          constatado,
          resumo,
          consultado_em: consultadoEm,
          fonte: "consultar_placa_v2",
          ...(dossiePersist ? { dossie: dossiePersist } : {}),
        };
      }

      const dadosLeilao: Record<string, unknown> = {
        ...prevRoot,
        consultas_premium: block,
      };
      sincronizarEvidenciasRenainfDePremium(dadosLeilao);

      const valorEvitarPerdaBlindagem = calcularValorEvitarPerdaReais({
        fipeTexto: typeof row.fipe === "string" ? row.fipe : "—",
        dadosLeilao,
        simulacaoViabilidade: row.simulacao_viabilidade,
      });

      if (!usarMock) {
        const debitou = await debitarCreditoPremium(idCliente);
        if (!debitou) {
          console.error(
            "[INCONSISTENCIA_FINANCEIRA] blindagem_apis_ok mas debito_credito_premium_falhou",
            {
              placa: placaNorm,
              usuario: idCliente,
              tipos: faltantes.join(","),
            }
          );
          return {
            sucesso: false,
            erro:
              "Não foi possível registrar o uso do crédito após as consultas. Nenhum resultado foi salvo.",
          };
        }
        console.info(
          `[BLINDAGEM_SUCESSO] placa=${placaNorm} credito_debitado=1 tipos=${faltantes.join(",")}`
        );
      }

      const { error: writeError } = await supabaseAdmin
        .from("consultas_veiculos")
        .update({ dados_leilao: dadosLeilao })
        .eq("placa", placaNorm);

      if (writeError) {
        console.error(
          "[INCONSISTENCIA_FINANCEIRA] blindagem_debito_ok persistencia_falhou",
          {
            placa: placaNorm,
            usuario: idCliente,
            erroSupabase: writeError,
          }
        );
        console.error("[blindagem_completa] persistência", writeError);
        dispararPersistirEventoConsultaAuditoriaDb({
          clienteId: idCliente,
          placa: placaNorm,
          evento: "CONSULTA_ERRO",
          detalhe: "blindagem_persistencia_falhou_apos_debito",
          requestId: requestIdBlindagem,
        });
        return {
          sucesso: false,
          erro:
            "Crédito debitado, mas falhou ao salvar a blindagem. Contate o suporte com urgência.",
        };
      }

      if (!usarMock) {
        registrarEventoAuditoriaConsulta({
          usuarioId: idCliente,
          placa: placaNorm,
          custoRealReais:
            faltantes.length * getCustoUnitarioPremiumReais(),
          statusDebito: "debitado_ok",
          tipo: "consulta_premium_api",
          detalhe: `blindagem_completa tipos=${faltantes.join(",")}`,
        });
        const tr = tiposRiscoConstatadosPremium(block);
        dispararPersistirEventoConsultaAuditoriaDb({
          clienteId: idCliente,
          placa: placaNorm,
          evento: "CONSULTA_SUCESSO",
          detalhe: `blindagem_completa tipos=${faltantes.join(",")}`,
          tipoRiscoDetectado: tr,
          requestId: requestIdBlindagem,
        });
        dispararPersistirEventoConsultaAuditoriaDb({
          clienteId: idCliente,
          placa: placaNorm,
          evento: "CREDITO_CONSUMIDO",
          detalhe: "blindagem_completa x1",
          tipoRiscoDetectado: tr,
          valorEvitarPerda: valorEvitarPerdaBlindagem ?? undefined,
          requestId: requestIdBlindagem,
        });
      } else {
        console.info(`[BLINDAGEM_SUCESSO] placa=${placaNorm} modo=mock sem_debito`);
        registrarEventoAuditoriaConsulta({
          usuarioId: idCliente,
          placa: placaNorm,
          custoRealReais: 0,
          statusDebito: "nao_aplicavel_mock",
          tipo: "consulta_premium_api",
          detalhe: `blindagem_mock tipos=${faltantes.join(",")}`,
        });
      }

      return {
        sucesso: true,
        dadosLeilao,
        jaEraAtiva: false,
        valorEvitarPerdaReais: valorEvitarPerdaBlindagem,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[blindagem_completa]", e);
      return { sucesso: false, erro: msg };
    }
  });
}
