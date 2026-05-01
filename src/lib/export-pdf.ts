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

/** JPEG evita falhas de decodificação PNG no jsPDF com fatias de canvas em alguns browsers. */
const PDF_IMAGE_MIME = "image/jpeg" as const;
const PDF_IMAGE_FORMAT = "JPEG" as const;
const PDF_JPEG_QUALITY = 0.92;

function canvasToPdfImageData(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL(PDF_IMAGE_MIME, PDF_JPEG_QUALITY);
}

function addCanvasStripesToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  marginMm: number,
  usableWidthMm: number,
  usableHeightMm: number
): void {
  if (canvas.width <= 0 || canvas.height <= 0) return;

  const imgWidthMm = usableWidthMm;
  const sliceHeightPx = (usableHeightMm * canvas.width) / imgWidthMm;
  if (!Number.isFinite(sliceHeightPx) || sliceHeightPx <= 0) {
    const imgData = canvasToPdfImageData(canvas);
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
    pdf.addImage(imgData, PDF_IMAGE_FORMAT, marginMm, marginMm, imgWidthMm, imgHeightMm);
    return;
  }

  let sourceY = 0;
  let pageIndex = 0;

  while (sourceY < canvas.height) {
    const remaining = canvas.height - sourceY;
    const slicePx = Math.floor(sliceHeightPx);
    const thisSlicePx = Math.min(Math.max(1, slicePx || 1), remaining);
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
    const sliceData = canvasToPdfImageData(sliceCanvas);
    const sliceMmH = (thisSlicePx * imgWidthMm) / canvas.width;
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(sliceData, PDF_IMAGE_FORMAT, marginMm, marginMm, imgWidthMm, sliceMmH);
    sourceY += thisSlicePx;
    pageIndex += 1;
  }
}

async function html2canvasForPdf(el: HTMLElement) {
  const { default: html2canvas } = await import("html2canvas");
  const prevW = el.style.width;
  const prevH = el.style.height;
  el.style.width = `${el.scrollWidth}px`;
  el.style.height = `${el.scrollHeight}px`;
  try {
    return await html2canvas(el, {
      scale: HTML2CANVAS_OPTS.scale,
      useCORS: HTML2CANVAS_OPTS.useCORS,
      backgroundColor: HTML2CANVAS_OPTS.backgroundColor,
      logging: HTML2CANVAS_OPTS.logging,
      ignoreElements: (node) =>
        node instanceof HTMLElement && node.classList.contains("pdf-exclude"),
    });
  } finally {
    el.style.width = prevW;
    el.style.height = prevH;
  }
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
    if (canvas.width <= 0 || canvas.height <= 0) {
      pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
      return;
    }
    const imgWidthMm = usableWidth;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
    const imgData = canvasToPdfImageData(canvas);
    if (imgHeightMm <= usableHeight) {
      pdf.addImage(imgData, PDF_IMAGE_FORMAT, margin, margin, imgWidthMm, imgHeightMm);
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
      if (canvas.width <= 0 || canvas.height <= 0) {
        continue;
      }
      const hMm = (canvas.height * usableWidth) / canvas.width;

      if (hMm <= usableHeight) {
        if (hasPage && cursorY + hMm > pageHeight - margin) {
          pdf.addPage();
          cursorY = margin;
        }
        hasPage = true;
        pdf.addImage(
          canvasToPdfImageData(canvas),
          PDF_IMAGE_FORMAT,
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
