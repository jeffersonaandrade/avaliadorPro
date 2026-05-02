"use client";

import { createElement } from "react";
import { pdf } from "@react-pdf/renderer";

import { TemplateRelatorioPdf } from "@/components/pdf/TemplateRelatorioPdf";
import type { TemplateRelatorioPdfProps } from "@/components/pdf/TemplateRelatorioPdf";

/**
 * Gera PDF vetorial (texto selecionável) com @react-pdf/renderer.
 */
export async function exportarRelatorioPdf(
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
