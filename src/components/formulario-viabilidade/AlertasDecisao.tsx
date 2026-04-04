"use client";

import { formatarMoedaBRL } from "@/lib/viabilidade";

export type AlertasDecisaoProps = {
  alertaPrejuizoCombinado: boolean;
  pedidoAcimaDoTetoSeguro: boolean;
  prejuizoPessimista: boolean;
  diferencaParaTeto: number;
  lucroElevado: boolean;
  vendaAbaixoDaFipe: boolean;
};

export function AlertasDecisao({
  alertaPrejuizoCombinado,
  pedidoAcimaDoTetoSeguro,
  prejuizoPessimista,
  diferencaParaTeto,
  lucroElevado,
  vendaAbaixoDaFipe,
}: AlertasDecisaoProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {alertaPrejuizoCombinado ? (
        <div
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-900"
          role="alert"
          data-testid="alerta-prejuizo-decisao"
        >
          {pedidoAcimaDoTetoSeguro ? (
            <p className="font-semibold">
              🚨 Você pode perder dinheiro: O preço pedido está{" "}
              <span className="font-mono font-bold tabular-nums">
                {formatarMoedaBRL(diferencaParaTeto)}
              </span>{" "}
              acima do limite de segurança (oferta máxima sugerida).
            </p>
          ) : null}
          {prejuizoPessimista ? (
            <p className={pedidoAcimaDoTetoSeguro ? "mt-2 font-semibold" : "font-semibold"}>
              🚨 Cenário conservador com venda realista de mercado indica risco de prejuízo operacional.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {lucroElevado ? (
            <div
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-snug text-amber-900"
              role="note"
              data-testid="aviso-lucro-elevado"
            >
              ⚠️ Margem acima da média de mercado (geralmente entre 10% e 20%).
              <br />
              Verifique se esse lucro é realista para esse veículo.
            </div>
          ) : null}
          {vendaAbaixoDaFipe ? (
            <div
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              role="note"
              data-testid="alerta-venda-abaixo-fipe"
            >
              ⚠️ A oferta máxima usa a referência de mercado (FIPE com seu ajuste, se houver).
              <br />
              A venda realista de mercado está abaixo da referência FIPE (tabela).
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
