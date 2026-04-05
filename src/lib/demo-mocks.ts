/**
 * Modo demonstração pública (`NEXT_PUBLIC_USE_MOCKS=true`):
 * painel sem login, APIs simuladas, sem débito real em `usuario_acesso`.
 */

import type { TipoConsultaRiscoPremium } from "@/lib/consultas-risco-premium";
import { PLACA_VEICULO_DEMONSTRACAO } from "@/lib/placa-teste-demo";
import { normalizarPlacaInput } from "@/lib/validations";

export const MOCK_DEMO_USER_ID = "demo-user" as const;

/** Referência de UX / documentação — espelhada em `usuarioDemoAcessoRow` (usuario-acesso). */
export const mockUserAcesso = {
  plano: "Premium",
  fipe_limite: 999,
  fipe_usado: 0,
  creditos_premium: 999,
  user_id: MOCK_DEMO_USER_ID,
} as const;

export function isPublicDemoMocksMode(): boolean {
  return (
    String(process.env.NEXT_PUBLIC_USE_MOCKS ?? "").trim().toLowerCase() ===
    "true"
  );
}

/** Placa de demonstração do painel (dossiê rico para PDF / UI). */
export function isDemoPlacaDossieRich(placaNorm: string): boolean {
  return normalizarPlacaInput(placaNorm) === PLACA_VEICULO_DEMONSTRACAO;
}

/**
 * Bloco persistido em `consultas_premium[tipo]` para a placa AAA0000 (sandbox),
 * alinhado à estrutura da API v2 + campo `dossie`.
 */
export function mockConsultasPremiumBlocoDemo(
  tipo: TipoConsultaRiscoPremium,
  consultadoEm: string
): Record<string, unknown> {
  switch (tipo) {
    case "leilao":
      return {
        constatado: true,
        resumo:
          "Leilão Prime: consta registro de oferta (demonstração). Classificação C — seguradora.",
        consultado_em: consultadoEm,
        fonte: "api_premium_mock_demo_placa",
        dossie: {
          kind: "leilao_prime",
          classificacao_letra: "C",
          classificacao_titulo:
            "Classe C — veículo com histórico ligado a seguradora (ex.: sinistro, indenização, leilão de seguradora).",
          registros: [
            {
              comitente: "HDI SEGUROS",
              lote: "Lote demonstração 8842-A",
              data_leilao: "2024-11-18",
            },
          ],
          ia_danos: [
            {
              local: "Para-lama dianteiro direito",
              descricao: "Amassado / possível colisão lateral",
              probabilidade: "78%",
            },
            {
              local: "Capô",
              descricao: "Micro-ondulações compatíveis com granizo ou uso",
              probabilidade: "62%",
            },
          ],
          fotos_remarketing: [
            "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
            "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
          ],
          imagens_ia: [
            "https://images.unsplash.com/photo-1489823559147-7d453a9b1a1e?w=800&q=80",
          ],
        },
      };
    case "sinistro":
      return {
        constatado: false,
        resumo:
          "Sinistro (perda total): sem registro na consulta de demonstração.",
        consultado_em: consultadoEm,
        fonte: "api_premium_mock_demo_placa",
        dossie: {
          kind: "sinistro",
          payload: { possui_registro: "não" },
        },
      };
    case "roubo_furto":
      return {
        constatado: true,
        resumo:
          "Roubo/furto: 3 registro(s) históricos na base (demonstração — PR).",
        consultado_em: consultadoEm,
        fonte: "api_premium_mock_demo_placa",
        dossie: {
          kind: "roubo_furto",
          registros: [
            {
              boletim_ocorrencia: "BO-PR-2023-889901",
              data_boletim_ocorrencia: "2023-06-12",
              tipo_ocorrencia: "Furto qualificado",
              uf_ocorrencia: "PR",
            },
            {
              boletim_ocorrencia: "BO-PR-2022-441102",
              data_boletim_ocorrencia: "2022-09-03",
              tipo_ocorrencia: "Roubo de veículo",
              uf_ocorrencia: "PR",
            },
            {
              boletim_ocorrencia: "BO-PR-2021-220015",
              data_boletim_ocorrencia: "2021-01-22",
              tipo_ocorrencia: "Tentativa de furto",
              uf_ocorrencia: "PR",
            },
          ],
        },
      };
    case "gravame":
      return {
        constatado: true,
        resumo: "Gravame: registro ativo (demonstração — agente financeiro).",
        consultado_em: consultadoEm,
        fonte: "api_premium_mock_demo_placa",
        dossie: {
          kind: "gravame",
          agente_financeiro_nome: "BANCO DEMONSTRAÇÃO S.A.",
          data_registro: "2023-04-10",
          situacao: "Ativo — alienação fiduciária",
        },
      };
    case "renainf":
      return {
        constatado: true,
        resumo:
          "Renainf: 1 infração registrada. Total estimado das multas: R$ 130,16.",
        consultado_em: consultadoEm,
        fonte: "api_premium_mock_demo_placa",
        dossie: {
          kind: "renainf",
          valor_total_reais: 130.16,
          infracoes: [
            {
              infracao:
                "Transitar em velocidade superior à máxima permitida em até 20%",
              orgao_autuador: "PRF",
              valor_aplicado: "R$ 130,16",
              local_infracao:
                "BR-277 / PR — quilômetro referência demonstração",
            },
          ],
        },
      };
    default:
      return {
        constatado: false,
        resumo: "Consulta demonstração.",
        consultado_em: consultadoEm,
        fonte: "api_premium_mock_demo_placa",
      };
  }
}
