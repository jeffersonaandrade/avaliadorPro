export type VereditoCardStatus = "incompleto" | "aprovado" | "reprovado";

export type VereditoCardProps = {
  variant?: "ui" | "pdf";
  status?: VereditoCardStatus;
  titulo?: string;
  subtitulo?: string;
  badgeTexto?: string;
  emoji?: string;
  molduraClassName?: string;
  "data-testid"?: string;
};

function tituloSubtituloPorStatus(
  status: VereditoCardStatus
): { titulo: string; subtitulo?: string } {
  switch (status) {
    case "incompleto":
      return {
        titulo: "Análise de risco incompleta",
        subtitulo:
          "Valores abaixo usam referência de mercado e custos informados. Valide o histórico premium para concluir riscos ocultos (leilão, sinistro, gravame e demais bases).",
      };
    case "aprovado":
      return { titulo: "RECOMENDADO" };
    case "reprovado":
      return {
        titulo: "Não recomendado",
        subtitulo: "Reveja riscos e custos antes de fechar o negócio.",
      };
    default:
      return { titulo: "Decisão em análise" };
  }
}

const molduraPdfFallback =
  "border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-200";

const tituloUi =
  "min-w-0 max-w-full break-words text-pretty px-2 text-center text-lg font-black uppercase leading-snug tracking-tight text-slate-900 sm:text-xl md:text-2xl";

const tituloPdf =
  "min-w-0 max-w-full break-words text-pretty text-center text-base font-black uppercase leading-snug tracking-tight sm:text-lg md:text-xl lg:text-2xl";

const subUi =
  "mx-auto mt-2 max-w-lg min-w-0 break-words text-pretty text-center text-sm leading-relaxed text-slate-600";

const subPdf =
  "mx-auto mt-2 max-w-full min-w-0 break-words text-pretty text-center text-xs font-medium leading-relaxed opacity-90";

/**
 * Veredito — alinhado ao DS: `min-w-0`, `break-words`, `text-pretty`, `leading-relaxed`.
 */
export function VereditoCard({
  variant = "ui",
  status,
  titulo: tituloProp,
  subtitulo: subtituloProp,
  badgeTexto,
  emoji,
  molduraClassName,
  "data-testid": dataTestId,
}: VereditoCardProps) {
  const fromStatus =
    status !== undefined && tituloProp === undefined
      ? tituloSubtituloPorStatus(status)
      : null;
  const titulo = tituloProp ?? fromStatus?.titulo ?? "Decisão em análise";
  const subtitulo = subtituloProp ?? fromStatus?.subtitulo;

  if (variant === "pdf") {
    const moldura = molduraClassName ?? molduraPdfFallback;
    return (
      <div
        className={`w-full max-w-full min-w-0 break-words text-pretty rounded-2xl border-2 px-3 py-4 text-center leading-relaxed sm:px-5 ${moldura}`}
        data-testid={dataTestId}
      >
        <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 sm:text-base">
          Veredito
        </p>
        <p className={`mt-2 ${tituloPdf}`}>{titulo}</p>
        {subtitulo ? <p className={`mt-2 ${subPdf}`}>{subtitulo}</p> : null}
      </div>
    );
  }

  return (
    <div className="max-w-full min-w-0 text-center" data-testid={dataTestId}>
      {badgeTexto ? (
        <p className="mx-auto mb-3 inline-flex max-w-full min-w-0 items-center justify-center break-words text-pretty rounded-full border border-amber-300/90 bg-amber-100/90 px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-amber-950 sm:px-4">
          {badgeTexto}
        </p>
      ) : null}
      {emoji ? (
        <p className="text-4xl leading-none sm:text-5xl" aria-hidden>
          {emoji}
        </p>
      ) : null}
      <p className={`mt-3 ${tituloUi}`}>{titulo}</p>
      {subtitulo ? <p className={subUi}>{subtitulo}</p> : null}
    </div>
  );
}
