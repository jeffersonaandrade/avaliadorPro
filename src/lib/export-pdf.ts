/**
 * Gera PDF A4 a partir de um nó HTML (client-only) via **html2pdf.js**.
 * Usa `pagebreak` (CSS + legacy) para respeitar `.pdf-section`, `.avoid-break`,
 * `.pdf-page-break-before` e `.pdf-force-page-break` — sem fatiamento manual por altura fixa.
 *
 * Antes da captura: prepara `crossOrigin` em imagens remotas (quando faltar),
 * aguarda carregamento, dois frames de pintura e um delay curto — melhora
 * html2canvas + fundos/cores.
 *
 * Elementos com classe `pdf-exclude` são ignorados no html2canvas.
 * Antes da captura, o nó recebe `pdf-capture-root` (removido ao final) para que o CSS
 * neutralize flex/grid no relatório — html2canvas não aplica `@media print`.
 *
 * Netlify Free (10s): relatório sem imagens remotas pesadas — só o que já
 * está pintado no DOM.
 */

/** Opções extras não tipadas no pacote (runtime suporta `pagebreak`). */
type Html2PdfSetOptions = {
  margin: number;
  filename: string;
  image: { type: "jpeg"; quality: number };
  pagebreak: {
    mode: ("css" | "legacy")[];
    avoid: string[];
    before: string[];
  };
  html2canvas: {
    scale: number;
    useCORS: boolean;
    backgroundColor: string;
    scrollY: number;
    windowWidth: number;
    windowHeight: number;
    ignoreElements: (node: Element) => boolean;
  };
  jsPDF: {
    unit: "mm";
    format: "a4";
    orientation: "portrait";
  };
};

const POST_PAINT_DELAY_MS = 120;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Dois rAF seguidos — deixa o browser aplicar layout/pintura após imagens. */
function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Imagens de outro origin sem `crossOrigin` contaminam o canvas do html2canvas.
 * Reatribui `src` com `anonymous` para permitir `useCORS: true` (exige CORS no servidor).
 */
function prepararCrossOriginImagensRemotas(root: HTMLElement): void {
  for (const el of root.querySelectorAll("img")) {
    if (!(el instanceof HTMLImageElement)) continue;
    const attr = el.getAttribute("src");
    if (!attr || attr.startsWith("data:") || attr.startsWith("blob:")) continue;
    let absolute: URL;
    try {
      absolute = new URL(attr, window.location.href);
    } catch {
      continue;
    }
    if (absolute.origin === window.location.origin) continue;
    if (el.crossOrigin === "anonymous" || el.crossOrigin === "use-credentials") {
      continue;
    }
    el.crossOrigin = "anonymous";
    const href = absolute.href;
    el.removeAttribute("src");
    el.src = href;
  }
}

function aguardarImagensNoElemento(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  const tarefas = imgs.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const fim = () => {
        img.removeEventListener("load", fim);
        img.removeEventListener("error", fim);
        resolve();
      };
      img.addEventListener("load", fim);
      img.addEventListener("error", fim);
    });
  });
  return Promise.all(tarefas)
    .then(() =>
      Promise.all(
        imgs.map((img) =>
          typeof img.decode === "function"
            ? img.decode().catch(() => undefined)
            : Promise.resolve()
        )
      )
    )
    .then(() => undefined);
}

export async function exportHtmlNodeToPdf(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  prepararCrossOriginImagensRemotas(element);
  await aguardarImagensNoElemento(element);
  await waitForNextPaint();
  await delay(POST_PAINT_DELAY_MS);

  const html2pdf = (await import("html2pdf.js")).default;
  const name = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;

  /** html2canvas usa media "screen"; @media print não aplica — espelha o bypass flex/grid na captura. */
  element.classList.add("pdf-capture-root");
  await waitForNextPaint();
  const w = Math.max(1, element.scrollWidth);
  const h = Math.max(1, element.scrollHeight);

  const opts: Html2PdfSetOptions = {
    margin: 8,
    filename: name,
    image: { type: "jpeg", quality: 0.98 },
    pagebreak: {
      mode: ["css", "legacy"],
      avoid: [".avoid-break", ".pdf-section"],
      before: [".pdf-page-break-before", ".pdf-force-page-break"],
    },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollY: 0,
      windowWidth: w,
      windowHeight: h,
      ignoreElements: (node) =>
        node instanceof HTMLElement && node.classList.contains("pdf-exclude"),
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    },
  };

  try {
    await html2pdf()
      .set(opts as never)
      .from(element)
      .save();
  } finally {
    element.classList.remove("pdf-capture-root");
  }
}
