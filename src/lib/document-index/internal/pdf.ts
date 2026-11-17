import "server-only";
import * as fs from "fs/promises";
import pdf from "pdf-parse";
import type { IndexFailureCode } from "../shared";

export type PdfPage = {
  page: number;
  text: string;
};

export class IndexFailure extends Error {
  constructor(readonly code: IndexFailureCode) {
    super(code);
  }
}

const MIN_CHARS_FOR_TEXT_PAGE = 30;
const MIN_TEXT_PAGE_RATIO = 0.1;
const PARAGRAPH_GAP_RATIO = 1.5;

type PdfJsTextItem = { str: string; transform: number[]; height?: number };

type PdfJsPage = {
  pageIndex: number;
  getTextContent(options: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }): Promise<{ items: PdfJsTextItem[] }>;
};

export async function extractPdfPages(filePath: string): Promise<PdfPage[]> {
  // pdf.js expects a plain Uint8Array; a Node Buffer goes through its deprecated `new Buffer()` clone path
  // and failed to parse in testing. The pdf-parse typings only admit Buffer.
  const data = new Uint8Array(await fs.readFile(filePath)) as unknown as Buffer;
  const raw = new Map<number, string>();
  let numpages: number;
  try {
    const result = await pdf(data, {
      pagerender: async (pageData: PdfJsPage) => {
        const text = await renderPageText(pageData);
        raw.set(pageData.pageIndex + 1, text);
        return text;
      },
    });
    numpages = result.numpages;
  } catch {
    throw new IndexFailure("unreadable_pdf");
  }
  if (numpages === 0) throw new IndexFailure("unreadable_pdf");

  const pages = [...raw.entries()]
    .sort(([a], [b]) => a - b)
    .map(([page, text]) => ({ page, text: normalizePageText(text) }))
    .filter(
      (page) => page.text.replace(/\s/g, "").length >= MIN_CHARS_FOR_TEXT_PAGE,
    );

  if (pages.length === 0 || pages.length / numpages < MIN_TEXT_PAGE_RATIO) {
    throw new IndexFailure("no_text_layer");
  }
  return pages;
}

async function renderPageText(pageData: PdfJsPage): Promise<string> {
  const { items } = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });
  let text = "";
  let lastY: number | undefined;
  let lastHeight = 0;
  for (const item of items) {
    const y = item.transform[5];
    if (lastY === undefined || y === lastY) {
      text += item.str;
    } else {
      const lineHeight = item.height || lastHeight || 0;
      const gap = Math.abs(lastY - y);
      text +=
        lineHeight > 0 && gap > lineHeight * PARAGRAPH_GAP_RATIO
          ? "\n\n"
          : "\n";
      text += item.str;
    }
    lastY = y;
    if (item.height) lastHeight = item.height;
  }
  return text;
}

export function normalizePageText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/(\w)-\n(?=[a-z])/g, "$1")
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
