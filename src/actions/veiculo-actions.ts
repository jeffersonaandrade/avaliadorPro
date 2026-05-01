"use server";

import { dispararPersistirEventoConsultaAuditoriaDb } from "@/lib/consulta-audit-supabase";
import { registrarEventoAuditoriaConsulta } from "@/lib/consulta-audit-log";
import {
  envNextPublicUseMocksAtivo,
  MOCK_DEMO_USER_ID,
  isPublicDemoMocksMode,
} from "@/lib/demo-mocks";
import { supabaseAdmin } from "@/lib/supabase";
import {
  consultarInformacoesBasicas,
  consultarPrecoFipePorPlaca,
} from "@/lib/consultar-placa";
import {
  colunasSandboxDbRow,
  marcacoesSandboxEmDadosLeilaoJson,
} from "@/lib/sandbox-integrity";
import type { LinhaConsultaVeiculo } from "@/lib/veiculo-cache";
import {
  buscarVeiculoCacheValido,
  obterEstadoCacheConsultaVeiculo,
} from "@/lib/veiculo-cache";
import { placaSchema } from "@/lib/validations";
import {
  podeResolverPrecoFipeComFundos,
  registrarConsultaFipe,
} from "@/lib/consumo-plano";
import { formatarMoedaBRLExibicao } from "@/lib/formato-moeda-exibicao";
import {
  carregarUsuarioAcesso,
  MSG_LIMITE_FIPE_SEM_SALDO_PRE_PAGO,
  MSG_SEM_PLANO,
  normalizarMesContadorFipe,
  type UsuarioAcessoRow,
} from "@/lib/usuario-acesso";

const AVISO_FIPE_INDISPONIVEL =
  "Referência de mercado indisponível para esta versão específica.";

function nzTxt(s: string | null | undefined): string {
  return (s ?? "").trim();
}

type CamposIdentidadeBasica = {
  marca: string;
  modelo: string;
  anoModelo: number;
  combustivel: string;
  tipoVeiculo: string;
};

/** Mesma identidade técnica já persistida — permite reutilizar FIPE sem nova chamada à API FIPE. */
function identidadeBasicaIgualLinhaCache(
  b: CamposIdentidadeBasica,
  linha: LinhaConsultaVeiculo
): boolean {
  return (
    nzTxt(b.marca) === nzTxt(linha.marca) &&
    nzTxt(b.modelo) === nzTxt(linha.modelo) &&
    b.anoModelo === linha.ano &&
    nzTxt(b.combustivel) === nzTxt(linha.combustivel) &&
    nzTxt(b.tipoVeiculo) === nzTxt(linha.tipo_veiculo)
  );
}

function linhaTemFipeResolvida(linha: LinhaConsultaVeiculo): boolean {
  const f = nzTxt(linha.fipe);
  return f.length > 0 && f !== "—";
}

function isSandboxMocksEnabled(): boolean {
  return envNextPublicUseMocksAtivo();
}

/** Perfil fixo para FIPE + mocks; sobrescreva com `AVALIADOR_MOCKS_SANDBOX_*` (servidor). */
const SANDBOX_DADOS_BASICOS_PADRAO = {
  marca: "HYUNDAI",
  modelo: "HYUNDAI/HB20 1.0M COMFOR",
  anoModelo: 2015,
  chassi: "9AAAA99AAAA999999",
  cor: "Branca",
  combustivel: "Álcool / Gasolina",
  tipoVeiculo: "Automovel",
} as const;

function parseAnoSandbox(raw: string | undefined): number | null {
  const t = raw?.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  const y = new Date().getFullYear();
  if (!Number.isFinite(n) || n < 1950 || n > y + 1) return null;
  return n;
}

function dadosBasicosSandbox(placaNorm: string) {
  const ano =
    parseAnoSandbox(process.env.AVALIADOR_MOCKS_SANDBOX_ANO_MODELO) ??
    SANDBOX_DADOS_BASICOS_PADRAO.anoModelo;
  return {
    placa: placaNorm,
    marca:
      process.env.AVALIADOR_MOCKS_SANDBOX_MARCA?.trim() ||
      SANDBOX_DADOS_BASICOS_PADRAO.marca,
    modelo:
      process.env.AVALIADOR_MOCKS_SANDBOX_MODELO?.trim() ||
      SANDBOX_DADOS_BASICOS_PADRAO.modelo,
    anoModelo: ano,
    chassi:
      process.env.AVALIADOR_MOCKS_SANDBOX_CHASSI?.trim() ||
      SANDBOX_DADOS_BASICOS_PADRAO.chassi,
    cor:
      process.env.AVALIADOR_MOCKS_SANDBOX_COR?.trim() ||
      SANDBOX_DADOS_BASICOS_PADRAO.cor,
    combustivel:
      process.env.AVALIADOR_MOCKS_SANDBOX_COMBUSTIVEL?.trim() ||
      SANDBOX_DADOS_BASICOS_PADRAO.combustivel,
    tipoVeiculo:
      process.env.AVALIADOR_MOCKS_SANDBOX_TIPO_VEICULO?.trim() ||
      SANDBOX_DADOS_BASICOS_PADRAO.tipoVeiculo,
  };
}

export type BuscarVeiculoResult =
  | {
      sucesso: true;
      placa: string;
      marca: string;
      modelo: string;
      ano: number;
      fipe: string;
      chassi: string;
      cor: string;
      combustivel: string;
      tipoVeiculo: string;
      avisoFipe?: string;
      mesReferenciaFipe: string | null;
      origem: "cache" | "novo";
      consultadoEm: string;
      simulacaoViabilidade: unknown | null;
      dadosLeilao: Record<string, unknown> | null;
      sandboxAtivo: boolean;
      dadosBasicosForamMockados: boolean;
      /** Consulta FIPE cobrada além da cota mensal (texto já formatado no servidor). */
      avisoConsultaFipeExcedente?: string;
    }
  | { sucesso: false; erro: string };

type LinhaConsulta = LinhaConsultaVeiculo;

/**
 * Preserva `consultas_premium` do cache expirado ao atualizar dados da API
 * (o retorno novo não inclui histórico pago).
 */
function mergeDadosLeilaoPreservandoPremium(
  anterior: Record<string, unknown> | null | undefined,
  novo: Record<string, unknown>
): Record<string, unknown> {
  const premium = anterior?.consultas_premium;
  if (
    premium &&
    typeof premium === "object" &&
    !Array.isArray(premium)
  ) {
    return { ...novo, consultas_premium: premium };
  }
  return novo;
}

function mapRowToSuccess(
  linha: LinhaConsulta,
  origem: "cache" | "novo"
): Extract<BuscarVeiculoResult, { sucesso: true }> {
  const aviso = linha.aviso_fipe?.trim() || undefined;
  const sandboxAtivo = isSandboxMocksEnabled();
  const consultadoEm =
    linha.atualizado_em?.trim() || linha.criado_em;
  return {
    sucesso: true,
    placa: linha.placa,
    marca: linha.marca,
    modelo: linha.modelo,
    ano: linha.ano,
    fipe: linha.fipe,
    chassi: linha.chassi ?? "—",
    cor: linha.cor ?? "—",
    combustivel: linha.combustivel ?? "—",
    tipoVeiculo: linha.tipo_veiculo ?? "—",
    mesReferenciaFipe: linha.mes_referencia_fipe,
    simulacaoViabilidade: linha.simulacao_viabilidade ?? null,
    dadosLeilao: linha.dados_leilao ?? null,
    sandboxAtivo,
    dadosBasicosForamMockados: false,
    ...(aviso ? { avisoFipe: aviso } : {}),
    origem,
    consultadoEm,
  };
}

function eventoCacheBasico(
  idCliente: string,
  placaNorm: string,
  detalhe: string
): void {
  registrarEventoAuditoriaConsulta({
    usuarioId: idCliente,
    placa: placaNorm,
    custoRealReais: 0,
    statusDebito: "nao_aplicavel_cache",
    tipo: "uso_cache_basico",
    detalhe,
  });
}

async function consultarVeiculoNaApiEPersistir(
  placaNorm: string,
  _usuario: UsuarioAcessoRow,
  idCliente: string,
  linhaAnterior: LinhaConsulta | null
): Promise<BuscarVeiculoResult> {
  const requestIdFluxo =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `veh-${Date.now()}-${placaNorm}`;

  const cacheImediato = await buscarVeiculoCacheValido(placaNorm);
  if (cacheImediato) {
    eventoCacheBasico(
      idCliente,
      placaNorm,
      "consulta_veiculo_ttl_antes_consultar_placa"
    );
    dispararPersistirEventoConsultaAuditoriaDb({
      clienteId: idCliente,
      placa: placaNorm,
      evento: "CACHE_HIT",
      tipoConsulta: "consulta_placa_mensal",
      detalhe: "consulta_veiculo_ttl_antes_consultar_placa",
      requestId: requestIdFluxo,
    });
    return mapRowToSuccess(cacheImediato, "cache");
  }

  const usarMocks = isSandboxMocksEnabled();
  if (usarMocks) {
    console.log(
      "[sandbox] Consultar Placa omitida — mock HB20; FIPE conforme limite do plano"
    );
  }

  const basica = usarMocks
    ? dadosBasicosSandbox(placaNorm)
    : await consultarInformacoesBasicas(placaNorm);

  if (!usarMocks) {
    dispararPersistirEventoConsultaAuditoriaDb({
      clienteId: idCliente,
      placa: placaNorm,
      evento: "API_CALL",
      tipoConsulta: "consulta_placa_mensal",
      detalhe: "consultar_placa_basico",
      requestId: requestIdFluxo,
    });
  }

  let fipeValor = "—";
  let mesRef: string | null = null;
  let avisoFipe: string | undefined;
  let fipeMatchBemSucedido = false;

  let dadosLeilao: Record<string, unknown> = usarMocks
    ? {
        fonte_identificacao: "sandbox_mock",
        sandbox_mock_hb20: true,
      }
    : {
        fonte_identificacao: "consultar_placa",
      };

  const reutilizarFipeDaLinha =
    linhaAnterior !== null &&
    identidadeBasicaIgualLinhaCache(basica, linhaAnterior) &&
    linhaTemFipeResolvida(linhaAnterior);

  if (!reutilizarFipeDaLinha) {
    const brutoGate = await carregarUsuarioAcesso(idCliente);
    if (!brutoGate) {
      return {
        sucesso: false,
        erro: "Não foi possível validar seu saldo para a consulta FIPE.",
      };
    }
    const uGate = await normalizarMesContadorFipe(brutoGate);
    if (!podeResolverPrecoFipeComFundos(uGate)) {
      return { sucesso: false, erro: MSG_LIMITE_FIPE_SEM_SALDO_PRE_PAGO };
    }
  }

  let chamouResolverFipeExterno = false;
  if (reutilizarFipeDaLinha && linhaAnterior) {
    fipeMatchBemSucedido = true;
    fipeValor = nzTxt(linhaAnterior.fipe);
    mesRef = linhaAnterior.mes_referencia_fipe;
    dadosLeilao = {
      ...dadosLeilao,
      fipe_reutilizada_linha_anterior: true,
    };
  } else {
    chamouResolverFipeExterno = !usarMocks;
    if (chamouResolverFipeExterno) {
      dispararPersistirEventoConsultaAuditoriaDb({
        clienteId: idCliente,
        placa: placaNorm,
        evento: "API_CALL",
        tipoConsulta: "consulta_placa_mensal",
        detalhe: "fipe_online_resolver",
        requestId: requestIdFluxo,
      });
    }
    try {
      const fipe = await consultarPrecoFipePorPlaca(placaNorm, {
        modeloVeiculo: basica.modelo,
        anoModelo: basica.anoModelo,
      });
      if (fipe) {
        fipeMatchBemSucedido = true;
        fipeValor = fipe.valor;
        mesRef = fipe.mesReferencia;
        if (fipe.avisoFipe) avisoFipe = fipe.avisoFipe;
        dadosLeilao = {
          ...dadosLeilao,
          codigo_fipe: fipe.codigoFipe,
          modelo_fipe: fipe.modeloFipeNome,
          combustivel_fipe: fipe.combustivelFipe,
          historico_fipe_12m: fipe.historico12Meses,
        };
      } else {
        avisoFipe = AVISO_FIPE_INDISPONIVEL;
        dadosLeilao = { ...dadosLeilao, fipe_match: false };
      }
    } catch (e) {
      console.error("[fipe] falha na resolução", e);
      avisoFipe = AVISO_FIPE_INDISPONIVEL;
      dadosLeilao = { ...dadosLeilao, fipe_erro: true };
    }
  }

  if (linhaAnterior?.dados_leilao) {
    dadosLeilao = mergeDadosLeilaoPreservandoPremium(
      linhaAnterior.dados_leilao,
      dadosLeilao
    );
  }

  dadosLeilao = {
    ...dadosLeilao,
    ...marcacoesSandboxEmDadosLeilaoJson(),
  };

  const consultadoEm = new Date().toISOString();
  const simulacaoPreservada =
    linhaAnterior?.simulacao_viabilidade ?? null;

  const { error: writeError } = await supabaseAdmin
    .from("consultas_veiculos")
    .upsert(
      {
        placa: placaNorm,
        marca: basica.marca,
        modelo: basica.modelo,
        ano: basica.anoModelo,
        fipe: fipeValor,
        chassi: basica.chassi,
        cor: basica.cor,
        combustivel: basica.combustivel,
        tipo_veiculo: basica.tipoVeiculo,
        mes_referencia_fipe: mesRef,
        aviso_fipe: avisoFipe ?? null,
        dados_leilao: dadosLeilao,
        simulacao_viabilidade: simulacaoPreservada,
        criado_em: consultadoEm,
        atualizado_em: consultadoEm,
        ...colunasSandboxDbRow(),
      },
      { onConflict: "placa" }
    );

  if (writeError) {
    console.error("[consultas_veiculos] upsert (admin)", writeError);
    const hint =
      writeError.code === "42501" || writeError.message.includes("403")
        ? " Verifique RLS e se SUPABASE_SERVICE_ROLE_KEY está correta (service_role)."
        : "";
    return {
      sucesso: false,
      erro: `Não foi possível salvar a análise.${hint}`.trim(),
    };
  }

  let avisoConsultaFipeExcedente: string | undefined;
  if (fipeMatchBemSucedido && !reutilizarFipeDaLinha) {
    const requestIdFipe =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `fipe-${Date.now()}-${placaNorm}`;
    const reg = await registrarConsultaFipe(idCliente, {
      placa: placaNorm,
      requestId: requestIdFipe,
    });
    if (!reg.ok) {
      console.error(
        "[buscarVeiculo] consumo FIPE não registrado (corrida ou persistência)",
        placaNorm,
        idCliente
      );
    } else if (reg.modo === "excedente") {
      avisoConsultaFipeExcedente = `Essa consulta consumiu ${formatarMoedaBRLExibicao(reg.valorCobradoReais)} do seu saldo pré-pago.`;
    }
  }

  return {
    sucesso: true,
    placa: placaNorm,
    marca: basica.marca,
    modelo: basica.modelo,
    ano: basica.anoModelo,
    fipe: fipeValor,
    chassi: basica.chassi,
    cor: basica.cor,
    combustivel: basica.combustivel,
    tipoVeiculo: basica.tipoVeiculo,
    mesReferenciaFipe: mesRef,
    simulacaoViabilidade: simulacaoPreservada,
    dadosLeilao,
    sandboxAtivo: isSandboxMocksEnabled(),
    dadosBasicosForamMockados: usarMocks,
    ...(avisoFipe ? { avisoFipe } : {}),
    ...(avisoConsultaFipeExcedente
      ? { avisoConsultaFipeExcedente }
      : {}),
    origem: "novo",
    consultadoEm,
  };
}

export async function buscarVeiculoAction(
  placa: string,
  identificadorCliente: string
): Promise<BuscarVeiculoResult> {
  const parsed = placaSchema.safeParse(placa);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Não foi possível validar a placa.";
    return { sucesso: false, erro: msg };
  }

  const placaNorm = parsed.data;
  const idCliente =
    (identificadorCliente ?? "").trim() ||
    (isPublicDemoMocksMode() ? MOCK_DEMO_USER_ID : "");
  if (!idCliente) {
    return {
      sucesso: false,
      erro:
        "Sessão não identificada. Permita armazenamento local no navegador ou utilize um link de acesso fornecido pela sua empresa.",
    };
  }

  const usuarioBruto = await carregarUsuarioAcesso(idCliente);
  if (!usuarioBruto?.plano_ativo) {
    return { sucesso: false, erro: MSG_SEM_PLANO };
  }
  const usuario = await normalizarMesContadorFipe(usuarioBruto);

  try {
    const estadoCache = await obterEstadoCacheConsultaVeiculo(placaNorm);

    if (estadoCache.status === "hit") {
      eventoCacheBasico(idCliente, placaNorm, "consulta_veiculo_ttl");
      const ridCache =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `cache-veh-${Date.now()}-${placaNorm}`;
      dispararPersistirEventoConsultaAuditoriaDb({
        clienteId: idCliente,
        placa: placaNorm,
        evento: "CACHE_HIT",
        tipoConsulta: "consulta_placa_mensal",
        detalhe: "consulta_veiculo_ttl",
        requestId: ridCache,
      });
      return mapRowToSuccess(estadoCache.linha, "cache");
    }

    if (estadoCache.status === "expirado") {
      return consultarVeiculoNaApiEPersistir(
        placaNorm,
        usuario,
        idCliente,
        estadoCache.linha
      );
    }

    return consultarVeiculoNaApiEPersistir(
      placaNorm,
      usuario,
      idCliente,
      null
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[buscarVeiculoAction]", e);
    if (
      msg.includes("CONSULTAR_PLACA") ||
      msg.includes("SUPABASE_SERVICE_ROLE_KEY") ||
      msg.includes("NEXT_PUBLIC_SUPABASE")
    ) {
      return { sucesso: false, erro: msg };
    }
    return { sucesso: false, erro: msg };
  }
}
