"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { consultarInformacoesBasicas } from "@/lib/consultar-placa";
import { resolverPrecoFipe } from "@/lib/fipe-resolver";
import { placaSchema } from "@/lib/validations";

const AVISO_FIPE_INDISPONIVEL =
  "Preço FIPE indisponível para esta versão específica.";

/** QA: economiza créditos Consultar Placa — `NEXT_PUBLIC_USE_MOCKS=true` no .env.local */
function isSandboxMocksEnabled(): boolean {
  return (
    String(process.env.NEXT_PUBLIC_USE_MOCKS ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}

/** Payload de teste (HB20) — não chama API paga; FIPE real segue no resolver. */
function dadosBasicosSandbox(placaNorm: string) {
  return {
    placa: placaNorm,
    marca: "HYUNDAI",
    modelo: "HYUNDAI/HB20 1.0M COMFOR",
    anoModelo: 2015,
    chassi: "9AAAA99AAAA999999",
    cor: "Branca",
    combustivel: "Álcool / Gasolina",
    tipoVeiculo: "Automovel",
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
      /** Texto da FIPE (ex.: "abril de 2026") para o badge */
      mesReferenciaFipe: string | null;
      origem: "cache" | "novo";
      consultadoEm: string;
      /** Última simulação salva no Supabase (JSON bruto) */
      simulacaoViabilidade: unknown | null;
      /** true se `NEXT_PUBLIC_USE_MOCKS=true` (exibe badge MODO SANDBOX no cliente) */
      sandboxAtivo: boolean;
      /** true só na linha nova quando dados básicos vieram do mock (não da Consultar Placa) */
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
  dados_leilao: Record<string, unknown> | null;
  simulacao_viabilidade: unknown | null;
};

function mapRowToSuccess(
  linha: LinhaConsulta,
  origem: "cache" | "novo"
): Extract<BuscarVeiculoResult, { sucesso: true }> {
  const aviso = linha.aviso_fipe?.trim() || undefined;
  const sandboxAtivo = isSandboxMocksEnabled();
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
    sandboxAtivo,
    dadosBasicosForamMockados: false,
    ...(aviso ? { avisoFipe: aviso } : {}),
    origem,
    consultadoEm: linha.criado_em,
  };
}

export async function buscarVeiculoAction(
  placa: string
): Promise<BuscarVeiculoResult> {
  const parsed = placaSchema.safeParse(placa);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "Não foi possível validar a placa.";
    return { sucesso: false, erro: msg };
  }

  const placaNorm = parsed.data;

  try {
    const { data: row, error: readError } = await supabaseAdmin
      .from("consultas_veiculos")
      .select(
        "placa, marca, modelo, ano, fipe, chassi, cor, combustivel, tipo_veiculo, mes_referencia_fipe, aviso_fipe, criado_em, dados_leilao, simulacao_viabilidade"
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
      console.log("Lido do Cache!");
      return mapRowToSuccess(row as LinhaConsulta, "cache");
    }

    const usarMocks = isSandboxMocksEnabled();
    if (usarMocks) {
      console.log(
        "[sandbox] Consultar Placa omitida — mock HB20; FIPE via resolver real"
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
      } else {
        avisoFipe = AVISO_FIPE_INDISPONIVEL;
        dadosLeilao = { ...dadosLeilao, fipe_match: false };
      }
    } catch (e) {
      console.error("[fipe] falha na resolução", e);
      avisoFipe = AVISO_FIPE_INDISPONIVEL;
      dadosLeilao = { ...dadosLeilao, fipe_erro: true };
    }

    const consultadoEm = new Date().toISOString();

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
          simulacao_viabilidade: null,
          criado_em: consultadoEm,
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
        erro: `Não foi possível salvar a consulta.${hint}`.trim(),
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
      simulacaoViabilidade: null,
      sandboxAtivo: isSandboxMocksEnabled(),
      dadosBasicosForamMockados: usarMocks,
      ...(avisoFipe ? { avisoFipe } : {}),
      origem: "novo",
      consultadoEm,
    };
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
