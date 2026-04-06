/**
 * Dados simulados do Centro de Comando (admin) — alinhado ao modo demo
 * (`NEXT_PUBLIC_USE_MOCKS=true`).
 */

import type { StatusDebitoAuditoria } from "@/lib/consulta-audit-log";
import {
  agruparEventosEmTransacoes,
  calcularKpisConciliacao,
  type DashboardReconciliacao,
  type LinhaEventoAuditoriaDb,
  type LinhaPersistenciaReconciliacao,
  type ResumoRoiConfiabilidade,
} from "@/lib/reconciliacao-auditoria";

export type KpisAdmin = {
  faturamentoBrutoReais: number;
  custoTotalApiReais: number;
  lucroLiquidoReais: number;
  volumeConsultas: number;
  custoPorConsultaPremiumReais: number;
};

/** KPIs de exemplo para o dashboard administrativo em modo demo. */
export const mockKpisAdmin: KpisAdmin = {
  faturamentoBrutoReais: 4580,
  custoTotalApiReais: 1280,
  lucroLiquidoReais: 3300,
  volumeConsultas: 186,
  custoPorConsultaPremiumReais: 16,
};

export type LinhaAuditoriaAdminDemo = {
  id: string;
  usuario: string;
  placa: string;
  custoRealReais: number;
  statusDebito: StatusDebitoAuditoria;
  dataHoraIso: string;
};

/** Últimas 10 linhas simuladas para a tabela de auditoria (demo). */
export const mockAuditoriaConsultas10: LinhaAuditoriaAdminDemo[] = [
  {
    id: "d1",
    usuario: "Auto Center Sul",
    placa: "ABC1D23",
    custoRealReais: 16,
    statusDebito: "debitado_ok",
    dataHoraIso: "2026-04-02T14:32:00.000Z",
  },
  {
    id: "d2",
    usuario: "demo-user",
    placa: "XYZ8K44",
    custoRealReais: 0,
    statusDebito: "nao_aplicavel_cache",
    dataHoraIso: "2026-04-02T14:28:00.000Z",
  },
  {
    id: "d3",
    usuario: "Revenda Horizonte LTDA",
    placa: "AAA0001",
    custoRealReais: 16,
    statusDebito: "debitado_ok",
    dataHoraIso: "2026-04-02T13:55:00.000Z",
  },
  {
    id: "d4",
    usuario: "Revenda Horizonte LTDA",
    placa: "AAA0002",
    custoRealReais: 16,
    statusDebito: "debito_falhou",
    dataHoraIso: "2026-04-02T13:52:00.000Z",
  },
  {
    id: "d5",
    usuario: "Pátio Premium",
    placa: "RIO2B19",
    custoRealReais: 80,
    statusDebito: "debitado_ok",
    dataHoraIso: "2026-04-02T12:10:00.000Z",
  },
  {
    id: "d6",
    usuario: "Auto Center Sul",
    placa: "QWE5F67",
    custoRealReais: 0,
    statusDebito: "nao_aplicavel_cache",
    dataHoraIso: "2026-04-02T11:40:00.000Z",
  },
  {
    id: "d7",
    usuario: "Loja Norte",
    placa: "MMM9900",
    custoRealReais: 16,
    statusDebito: "debitado_ok",
    dataHoraIso: "2026-04-02T10:05:00.000Z",
  },
  {
    id: "d8",
    usuario: "demo-user",
    placa: "HB20MOCK",
    custoRealReais: 0,
    statusDebito: "nao_aplicavel_mock",
    dataHoraIso: "2026-04-01T18:22:00.000Z",
  },
  {
    id: "d9",
    usuario: "Garagem Central",
    placa: "JJJ1234",
    custoRealReais: 16,
    statusDebito: "debitado_ok",
    dataHoraIso: "2026-04-01T16:00:00.000Z",
  },
  {
    id: "d10",
    usuario: "Revenda Horizonte LTDA",
    placa: "TTT4321",
    custoRealReais: 0,
    statusDebito: "nao_aplicavel_cache",
    dataHoraIso: "2026-04-01T09:15:00.000Z",
  },
];

export type AlertaUsoSuspeitoDemo = {
  id: string;
  titulo: string;
  descricao: string;
  severidade: "alta" | "media";
};

export const mockAlertasUsoSuspeito: AlertaUsoSuspeitoDemo[] = [
  {
    id: "a1",
    titulo: "Enumeração de placas (simulado)",
    descricao:
      "Usuário Revenda Horizonte LTDA consultou AAA0001 e AAA0002 em sequência — padrão típico de scraping.",
    severidade: "alta",
  },
  {
    id: "a2",
    titulo: "Pico de uso de cache (simulado)",
    descricao:
      "Conta demo-user: 12 acessos a dados premium em cache em 6 minutos — possível compartilhamento de sessão.",
    severidade: "media",
  },
];

const baseIso = "2026-04-02T17:00:00.000Z";

/** Linhas de exemplo para timeline / reconciliação (demo). */
export const mockLinhasTimelineReconciliacao: LinhaEventoAuditoriaDb[] = [
  {
    id: "r1",
    criado_em: "2026-04-02T17:00:01.000Z",
    cliente_id: "demo-user",
    placa: "ABC1D23",
    evento: "CONSULTA_INICIO",
    tipo_consulta: "leilao",
    detalhe: null,
    valor_evitar_perda: null,
    tipo_risco_detectado: null,
    request_id: "550e8400-e29b-41d4-a716-446655440001",
  },
  {
    id: "r2",
    criado_em: "2026-04-02T17:00:05.200Z",
    cliente_id: "demo-user",
    placa: "ABC1D23",
    evento: "CONSULTA_SUCESSO",
    tipo_consulta: "leilao",
    detalhe: null,
    valor_evitar_perda: null,
    tipo_risco_detectado: "leilao_limpo",
    request_id: "550e8400-e29b-41d4-a716-446655440001",
  },
  {
    id: "r3",
    criado_em: "2026-04-02T17:00:06.100Z",
    cliente_id: "demo-user",
    placa: "ABC1D23",
    evento: "CREDITO_CONSUMIDO",
    tipo_consulta: "leilao",
    detalhe: "debito_1_credito_pos_api",
    valor_evitar_perda: 1200,
    tipo_risco_detectado: "leilao_limpo",
    request_id: "550e8400-e29b-41d4-a716-446655440001",
  },
];

const mockLinhasGruposDemo: LinhaEventoAuditoriaDb[] = [
  ...mockLinhasTimelineReconciliacao,
  {
    id: "r4",
    criado_em: "2026-04-02T16:30:00.000Z",
    cliente_id: "user-antigo",
    placa: "ZZZ9999",
    evento: "CONSULTA_INICIO",
    tipo_consulta: "sinistro",
    detalhe: null,
    valor_evitar_perda: null,
    tipo_risco_detectado: null,
    request_id: null,
  },
  {
    id: "r5",
    criado_em: "2026-04-02T16:30:45.000Z",
    cliente_id: "user-antigo",
    placa: "ZZZ9999",
    evento: "CREDITO_CONSUMIDO",
    tipo_consulta: "sinistro",
    detalhe: "debito_1_credito_pos_api",
    valor_evitar_perda: 500,
    tipo_risco_detectado: null,
    request_id: null,
  },
  {
    id: "r6",
    criado_em: "2026-04-02T15:00:00.000Z",
    cliente_id: "user-abandono",
    placa: "AAA0001",
    evento: "CONSULTA_INICIO",
    tipo_consulta: "gravame",
    detalhe: null,
    valor_evitar_perda: null,
    tipo_risco_detectado: null,
    request_id: "abandono-simulado-1",
  },
];

const mockAmostrasPersistenciaDemo: LinhaPersistenciaReconciliacao[] = [
  {
    eventoId: "r3",
    placa: "ABC1D23",
    cliente_id: "demo-user",
    criado_em: "2026-04-02T17:00:06.100Z",
    tipo_consulta: "leilao",
    detalhe: "debito_1_credito_pos_api",
    persistenciaOk: true,
    motivoPersistencia: "Tipo leilao presente e dentro do TTL",
  },
  {
    eventoId: "r5",
    placa: "ZZZ9999",
    cliente_id: "user-antigo",
    criado_em: "2026-04-02T16:30:45.000Z",
    tipo_consulta: "sinistro",
    detalhe: "debito_1_credito_pos_api",
    persistenciaOk: false,
    motivoPersistencia:
      "⚠️ POSSÍVEL FALHA DE PERSISTÊNCIA — crédito registrado mas tipo sinistro ausente ou fora do TTL em dados_leilao",
  },
];

/** Dashboard de reconciliação simulado (alerta D > C e grupos críticos). */
export function mockReconciliacaoDashboard(): DashboardReconciliacao {
  const kpis = calcularKpisConciliacao({
    CONSULTA_SUCESSO: 42,
    CREDITO_CONSUMIDO: 48,
    CONSULTA_ERRO: 5,
    CONSULTA_TIMEOUT: 2,
    CONSULTA_INICIO: 60,
    CACHE_HIT: 120,
  });

  const grupos = agruparEventosEmTransacoes(mockLinhasGruposDemo);
  const gruposCriticos = grupos.filter(
    (g) =>
      g.classificacao === "abandonada" ||
      g.classificacao === "inconsistente_credito_sem_sucesso"
  );

  return {
    desdeIso: baseIso,
    diasJanela: 30,
    kpis,
    agregadoClientes: [
      {
        cliente_id: "demo-user",
        creditosConsumidos: 48,
        consultasSucesso: 42,
        falhas: 7,
        inicios: 55,
        somaValorEvitarPerda: 58_400,
      },
      {
        cliente_id: "Revenda Horizonte LTDA",
        creditosConsumidos: 22,
        consultasSucesso: 22,
        falhas: 0,
        inicios: 24,
        somaValorEvitarPerda: 12_100,
      },
    ],
    gruposCriticos,
    amostrasPersistencia: mockAmostrasPersistenciaDemo,
    erroLeitura: null,
  };
}

/** Resumo ROI mês UTC para demo (inclui valor suspeito > 0 para exibir alerta no admin). */
export function mockResumoRoiConfiabilidadeMes(): ResumoRoiConfiabilidade {
  return {
    valor_total_protegido_valido: 124_200,
    valor_total_protegido_suspeito: 1_800,
    total_consultas_validas: 41,
    total_consultas_suspeitas: 2,
  };
}
