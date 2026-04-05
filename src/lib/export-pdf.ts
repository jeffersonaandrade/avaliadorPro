/**
 * Gera PDF A4 a partir de um nó HTML (client-only).
 * Elementos com classe `pdf-exclude` não entram na captura.
 *
 * Se existirem filhos `[data-pdf-chunk]`, cada bloco é capturado separadamente
 * e posicionado no PDF sem cortar no meio de uma seção (quebras só entre chunks
 * ou, se um chunk for mais alto que a página, fatias desse chunk apenas).
 *
 * Netlify Free (10s): o relatório não deve incluir imagens remotas pesadas —
 * `html2canvas` com `useCORS` só captura o que já está pintado no DOM.
 */

import type { jsPDF } from "jspdf";

const HTML2CANVAS_OPTS = {
  scale: 2,
  backgroundColor: "#ffffff",
  useCORS: true,
  logging: false,
} as const;

function addCanvasStripesToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  marginMm: number,
  usableWidthMm: number,
  usableHeightMm: number
): void {
  const imgWidthMm = usableWidthMm;
  const sliceHeightPx = (usableHeightMm * canvas.width) / imgWidthMm;
  let sourceY = 0;
  let pageIndex = 0;

  while (sourceY < canvas.height) {
    const thisSlicePx = Math.min(sliceHeightPx, canvas.height - sourceY);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = thisSlicePx;
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      thisSlicePx,
      0,
      0,
      canvas.width,
      thisSlicePx
    );
    const sliceData = sliceCanvas.toDataURL("image/png");
    const sliceMmH = (thisSlicePx * imgWidthMm) / canvas.width;
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(sliceData, "PNG", marginMm, marginMm, imgWidthMm, sliceMmH);
    sourceY += thisSlicePx;
    pageIndex += 1;
  }
}

async function html2canvasForPdf(el: HTMLElement) {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(el, {
    ...HTML2CANVAS_OPTS,
    ignoreElements: (node) =>
      node instanceof HTMLElement && node.classList.contains("pdf-exclude"),
  });
}

export async function exportHtmlNodeToPdf(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  const [{ jsPDF }] = await Promise.all([import("jspdf")]);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const GAP_MM = 4;

  const chunks = Array.from(
    element.querySelectorAll<HTMLElement>("[data-pdf-chunk]")
  );

  if (chunks.length === 0) {
    const canvas = await html2canvasForPdf(element);
    const imgWidthMm = usableWidth;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
    const imgData = canvas.toDataURL("image/png");
    if (imgHeightMm <= usableHeight) {
      pdf.addImage(imgData, "PNG", margin, margin, imgWidthMm, imgHeightMm);
    } else {
      addCanvasStripesToPdf(pdf, canvas, margin, usableWidth, usableHeight);
    }
  } else {
    let cursorY = margin;
    let hasPage = false;
    let startNextChunkOnNewPage = false;

    for (const chunk of chunks) {
      if (startNextChunkOnNewPage) {
        pdf.addPage();
        cursorY = margin;
        startNextChunkOnNewPage = false;
      }

      const canvas = await html2canvasForPdf(chunk);
      const hMm = (canvas.height * usableWidth) / canvas.width;

      if (hMm <= usableHeight) {
        if (hasPage && cursorY + hMm > pageHeight - margin) {
          pdf.addPage();
          cursorY = margin;
        }
        hasPage = true;
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          margin,
          cursorY,
          usableWidth,
          hMm
        );
        cursorY += hMm + GAP_MM;
        continue;
      }

      if (hasPage && cursorY > margin) {
        pdf.addPage();
        cursorY = margin;
      }
      hasPage = true;
      addCanvasStripesToPdf(pdf, canvas, margin, usableWidth, usableHeight);
      startNextChunkOnNewPage = true;
    }
  }

  const name = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  pdf.save(name);
}
