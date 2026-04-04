"use client";

export type AlertasHistoricoVeiculoProps = {
  temRiscoEstrutural: boolean;
  impactoTotal: number;
};

export function AlertasHistoricoVeiculo({
  temRiscoEstrutural,
  impactoTotal,
}: AlertasHistoricoVeiculoProps) {
  return (
    <>
      {temRiscoEstrutural ? (
        <div
          className="rounded-xl border border-amber-300/90 bg-amber-50 px-4 py-3 text-sm font-medium leading-snug text-amber-950"
          role="status"
          data-testid="badge-historico-relevante"
        >
          ⚠️ Veículo com histórico relevante — valor de mercado reduzido
        </div>
      ) : null}
      {temRiscoEstrutural && impactoTotal < -0.3 ? (
        <div
          className="rounded-xl border border-red-400/90 bg-red-50 px-4 py-3 text-sm font-semibold leading-snug text-red-950"
          role="alert"
          data-testid="alerta-baixa-liquidez"
        >
          🚨 Este veículo pode ter baixa liquidez no mercado
        </div>
      ) : null}
    </>
  );
}
