"use client";

import { createElement } from "react";
import { pdf } from "@react-pdf/renderer";

import { TemplateRelatorioPdf } from "@/components/pdf/TemplateRelatorioPdf";
import type { TemplateRelatorioPdfProps } from "@/components/pdf/TemplateRelatorioPdf";

/**
 * Gera PDF vetorial (texto selecionável) com @react-pdf/renderer.
 * Caminho paralelo ao html2pdf em `export-pdf.ts` — Fase 1 sem dossiê/multas.
 */
export async function exportarRelatorioPdfNativo(
  dados: TemplateRelatorioPdfProps,
  fileBaseName: string
): Promise<void> {
  const name = fileBaseName.endsWith(".pdf") ? fileBaseName : `${fileBaseName}.pdf`;
  const blob = await pdf(
    createElement(TemplateRelatorioPdf, dados) as Parameters<typeof pdf>[0]
  ).toBlob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
