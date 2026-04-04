"use server";

import { supabaseAdmin } from "@/lib/supabase";
import {
  cachePremiumConsultaFresco,
  corpoRespostaMinimoValido,
  estruturaMinimaPorTipo,
  fetchConsultarPlacaPremiumV2,
  isSandboxMocksPremiumEnabled,
  mockConsultarRiscoApiDeterministico,
  normalizarConsultaPremiumV2,
  withPremiumConsultaDedupe,
} from "@/lib/consultar-placa-premium-v2";
import {
  TIPOS_CONSULTA_RISCO_PREMIUM,
  type ResultadoConsultaRiscoCarregado,
  type TipoConsultaRiscoPremium,
} from "@/lib/consultas-risco-premium";
import { MOCK_DEMO_USER_ID, isPublicDemoMocksMode } from "@/lib/demo-mocks";
import {
  carregarUsuarioAcesso,
  debitarCreditoPremium,
  MSG_SEM_CREDITOS_PREMIUM,
  MSG_SEM_PLANO,
} from "@/lib/usuario-acesso";
import { placaSchema } from "@/lib/validations";

function isTipoConsultaRisco(s: string): s is TipoConsultaRiscoPremium {
  return (TIPOS_CONSULTA_RISCO_PREMIUM as readonly string[]).includes(s);
}

export type ConsultarRiscoPremiumOk = {
  sucesso: true;
  tipo: TipoConsultaRiscoPremium;
  resultado: ResultadoConsultaRiscoCarregado;
  dadosLeilao: Record<string, unknown>;
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
      .select("placa, dados_leilao")
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
        };
      }
    }

    const usarMock = isSandboxMocksPremiumEnabled();
    if (!usarMock && usuario.creditos_premium < 1) {
      return { sucesso: false, erro: MSG_SEM_CREDITOS_PREMIUM };
    }

    return withPremiumConsultaDedupe(placaNorm, tipoOk, async () => {
      console.info(`[CONSULTA_INICIO] tipo=${tipoOk} placa=${placaNorm}`);
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
        return {
          sucesso: true,
          tipo: tipoOk,
          resultado: { consultadoEm, constatado, resumo },
          dadosLeilao,
        };
      }

      const fetchResult = await fetchConsultarPlacaPremiumV2(tipoOk, placaNorm);

      if (!fetchResult.ok) {
        if (fetchResult.tipoErro === "timeout") {
          console.info(`[TIMEOUT] tipo=${tipoOk} placa=${placaNorm}`);
          console.info(`[CONSULTA_TIMEOUT] tipo=${tipoOk} placa=${placaNorm}`);
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
        return {
          sucesso: false,
          erro: "Dados da consulta incompletos. Tente novamente mais tarde.",
        };
      }

      const normBody = json as Parameters<typeof normalizarConsultaPremiumV2>[1];
      const { constatado, resumo } = normalizarConsultaPremiumV2(tipoOk, normBody);

      block[tipoOk] = {
        constatado,
        resumo,
        consultado_em: consultadoEm,
        fonte: "consultar_placa_v2",
      };

      const dadosLeilao: Record<string, unknown> = {
        ...prevRoot,
        consultas_premium: block,
      };

      const { error: writeError } = await supabaseAdmin
        .from("consultas_veiculos")
        .update({ dados_leilao: dadosLeilao })
        .eq("placa", placaNorm);

      if (writeError) {
        console.error("[consultas_risco] update", writeError);
        console.info(
          `[CONSULTA_ERRO] tipo=${tipoOk} placa=${placaNorm} motivo=persistencia`
        );
        return {
          sucesso: false,
          erro: "Não foi possível salvar o resultado da análise.",
        };
      }

      const debitou = await debitarCreditoPremium(idCliente);
      if (!debitou) {
        console.error(
          "[consultas_risco] débito crédito falhou pós-gravação",
          placaNorm
        );
      } else {
        const u2 = await carregarUsuarioAcesso(idCliente);
        const saldo = u2?.creditos_premium ?? 0;
        console.info(
          `[CREDIT_DEBIT] Usuario ${idCliente} - Serviço: ${tipoOk} - Saldo Restante: ${saldo}`
        );
      }

      console.info(`[CONSULTA_SUCESSO] tipo=${tipoOk} placa=${placaNorm}`);

      return {
        sucesso: true,
        tipo: tipoOk,
        resultado: {
          consultadoEm,
          constatado,
          resumo,
        },
        dadosLeilao,
      };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.info(`[CONSULTA_ERRO] tipo=${tipoOk} placa=${placaNorm} motivo=excecao ${msg}`);
    return { sucesso: false, erro: msg };
  }
}
