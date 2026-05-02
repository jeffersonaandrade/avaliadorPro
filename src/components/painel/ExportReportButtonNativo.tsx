"use client";

import { FileDown, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

import type { TemplateRelatorioPdfProps } from "@/components/pdf/TemplateRelatorioPdf";
import { exportarRelatorioPdfNativo } from "@/lib/export-pdf-nativo";

function sanitizarNomeArquivo(base: string): string {
  const s = base.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80);
  return s || "relatorio";
}

export type ExportReportButtonNativoProps = {
  fileBaseName: string;
  dados: TemplateRelatorioPdfProps;
};

/**
 * Exportação experimental: PDF nativo (@react-pdf/renderer). Mantém o botão html2pdf intacto.
 */
export function ExportReportButtonNativo({
  fileBaseName,
  dados,
}: ExportReportButtonNativoProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(async () => {
    setBusy(true);
    try {
      const nome = sanitizarNomeArquivo(fileBaseName);
      await exportarRelatorioPdfNativo(dados, `${nome}-nativo.pdf`);
    } finally {
      setBusy(false);
    }
  }, [dados, fileBaseName]);

  return (
    <button
      type="button"
      className="pdf-exclude inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-slate-600 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
      data-testid="btn-exportar-relatorio-pdf-nativo"
      disabled={busy}
      onClick={() => {
        void handleClick();
      }}
    >
      {busy ? (
        <Loader2
          className="size-4 shrink-0 animate-spin text-slate-700"
          strokeWidth={2}
          aria-hidden
        />
      ) : (
        <FileDown className="size-4 shrink-0 text-slate-700" strokeWidth={2} aria-hidden />
      )}
      {busy ? "Gerando PDF nativo…" : "Exportar PDF nativo"}
    </button>
  );
}
