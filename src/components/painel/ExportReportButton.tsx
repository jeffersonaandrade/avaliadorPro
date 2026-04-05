"use client";

import { FileDown, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

import { exportHtmlNodeToPdf } from "@/lib/export-pdf";

function sanitizarNomeArquivo(base: string): string {
  const s = base.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80);
  return s || "relatorio";
}

export type ExportReportButtonProps = {
  /** Sem extensão; será normalizado para arquivo seguro. */
  fileBaseName: string;
};

export function ExportReportButton({ fileBaseName }: ExportReportButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(async () => {
    const el = document.getElementById("area-relatorio");
    if (!el) return;
    setBusy(true);
    try {
      const nome = sanitizarNomeArquivo(fileBaseName);
      await exportHtmlNodeToPdf(el, `${nome}.pdf`);
    } finally {
      setBusy(false);
    }
  }, [fileBaseName]);

  return (
    <button
      type="button"
      className="pdf-exclude inline-flex items-center justify-center gap-2 rounded-xl border-2 border-cyan-600 bg-white px-4 py-2.5 text-sm font-bold text-cyan-800 shadow-sm transition hover:bg-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
      data-testid="btn-exportar-relatorio-pdf"
      disabled={busy}
      onClick={() => {
        void handleClick();
      }}
    >
      {busy ? (
        <Loader2
          className="size-4 shrink-0 animate-spin text-cyan-700"
          strokeWidth={2}
          aria-hidden
        />
      ) : (
        <FileDown className="size-4 shrink-0 text-cyan-700" strokeWidth={2} aria-hidden />
      )}
      {busy ? "Gerando PDF…" : "Exportar relatório PDF"}
    </button>
  );
}
