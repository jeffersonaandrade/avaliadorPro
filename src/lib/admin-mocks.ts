/**
 * Dados simulados do Centro de Comando (admin) — alinhado ao modo demo
 * (`NEXT_PUBLIC_USE_MOCKS=true`).
 */

import type { StatusDebitoAuditoria } from "@/lib/consulta-audit-log";

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
