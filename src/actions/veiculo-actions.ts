"use server";

import { registrarEventoAuditoriaConsulta } from "@/lib/consulta-audit-log";
import { MOCK_DEMO_USER_ID, isPublicDemoMocksMode } from "@/lib/demo-mocks";
import { supabaseAdmin } from "@/lib/supabase";
import { consultarInformacoesBasicas } from "@/lib/consultar-placa";
import { resolverPrecoFipe } from "@/lib/fipe-resolver";
import { placaSchema } from "@/lib/validations";
import {
  carregarUsuarioAcesso,
  incrementarConsultaFipeSucesso,
  MSG_LIMITE_FIPE_PLANO,
  MSG_SEM_PLANO,
  normalizarMesContadorFipe,
  podeUsarConsultaFipe,
  type UsuarioAcessoRow,
} from "@/lib/usuario-acesso";

const AVISO_FIPE_INDISPONIVEL =
  "Referência de mercado indisponível para esta versão específica.";

/** TTL do cache base de veículo/FIPE (dias). */
const TTL_CACHE_VEICULO_DIAS = 30;
const MS_POR_DIA = 86_400_000;

function isSandboxMocksEnabled(): boolean {
  return (
    String(process.env.NEXT_PUBLIC_USE_MOCKS ?? "")
      .trim()
      .toLowerCase() === "true"
  );
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
    }
  | { sucesso: false; erro: string };

type LinhaConsulta = {
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  fipe: string;
  chassi: string | null;
  cor: string | null;
  combustivel: string | null;
  tipo_veiculo: string | null;
  mes_referencia_fipe: string | null;
  aviso_fipe: string | null;
  criado_em: string;
  atualizado_em: string | null;
  dados_leilao: Record<string, unknown> | null;
  simulacao_viabilidade: unknown | null;
};

function timestampReferenciaCache(linha: LinhaConsulta): string {
  const a = linha.atualizado_em?.trim();
  if (a) return a;
  return linha.criado_em?.trim() ?? "";
}

function cacheBasicoEstaFresco(referenciaIso: string): boolean {
  const t = Date.parse(referenciaIso);
  if (!Number.isFinite(t)) return false;
  const idadeMs = Date.now() - t;
  return idadeMs < TTL_CACHE_VEICULO_DIAS * MS_POR_DIA;
}

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

async function consultarVeiculoNaApiEPersistir(
  placaNorm: string,
  usuario: UsuarioAcessoRow,
  idCliente: string,
  linhaAnterior: LinhaConsulta | null
): Promise<BuscarVeiculoResult> {
  const usarMocks = isSandboxMocksEnabled();
  if (usarMocks) {
    console.log(
      "[sandbox] Consultar Placa omitida — mock HB20; FIPE conforme limite do plano"
    );
  }

  const basica = usarMocks
    ? dadosBasicosSandbox(placaNorm)
    : await consultarInformacoesBasicas(placaNorm);

  let fipeValor = "—";
  let mesRef: string | null = null;
  let avisoFipe: string | undefined;

  let dadosLeilao: Record<string, unknown> = usarMocks
    ? {
        fonte_identificacao: "sandbox_mock",
        sandbox_mock_hb20: true,
      }
    : {
        fonte_identificacao: "consultar_placa",
      };

  const podeFipe = podeUsarConsultaFipe(usuario);

  if (!podeFipe) {
    avisoFipe = MSG_LIMITE_FIPE_PLANO;
  } else {
    try {
      const fipe = await resolverPrecoFipe({
        marca: basica.marca,
        modelo: basica.modelo,
        anoModelo: basica.anoModelo,
        combustivel: basica.combustivel,
        tipoVeiculo: basica.tipoVeiculo,
      });
      if (fipe) {
        fipeValor = fipe.valor;
        mesRef = fipe.mesReferencia;
        dadosLeilao = {
          ...dadosLeilao,
          modelo_fipe: fipe.modeloFipeNome,
          combustivel_fipe: fipe.combustivelFipe,
        };
        await incrementarConsultaFipeSucesso(idCliente);
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
    const { data: row, error: readError } = await supabaseAdmin
      .from("consultas_veiculos")
      .select(
        "placa, marca, modelo, ano, fipe, chassi, cor, combustivel, tipo_veiculo, mes_referencia_fipe, aviso_fipe, criado_em, atualizado_em, dados_leilao, simulacao_viabilidade"
      )
      .eq("placa", placaNorm)
      .maybeSingle();

    if (readError) {
      console.error("[consultas_veiculos] leitura (admin)", readError);
      const hint =
        readError.code === "42501" || readError.message.includes("403")
          ? " Permissão negada (RLS ou chave): revise políticas e SUPABASE_SERVICE_ROLE_KEY."
          : "";
      return {
        sucesso: false,
        erro: `Não foi possível consultar o banco.${hint}`.trim(),
      };
    }

    if (row) {
      const linha = row as LinhaConsulta;
      const refTs = timestampReferenciaCache(linha);
      if (cacheBasicoEstaFresco(refTs)) {
        registrarEventoAuditoriaConsulta({
          usuarioId: idCliente,
          placa: placaNorm,
          custoRealReais: 0,
          statusDebito: "nao_aplicavel_cache",
          tipo: "uso_cache_basico",
          detalhe: "consulta_veiculo_ttl",
        });
        return mapRowToSuccess(linha, "cache");
      }
      return consultarVeiculoNaApiEPersistir(
        placaNorm,
        usuario,
        idCliente,
        linha
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
