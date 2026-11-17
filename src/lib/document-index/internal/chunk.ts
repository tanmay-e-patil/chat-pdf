import type { PdfPage } from "./pdf";

export type Chunk = {
  page: number;
  ordinal: number;
  start: number;
  end: number;
  text: string;
};

const CHUNK_TARGET_CHARS = 1000;
const CHUNK_OVERLAP_CHARS = 150;
const SEPARATORS = ["\n\n", "\n", ". ", " "] as const;

export function chunkPage(page: PdfPage): Chunk[] {
  const { text } = page;
  const chunks: Chunk[] = [];
  let start = 0;
  while (start < text.length) {
    const hardEnd = Math.min(start + CHUNK_TARGET_CHARS, text.length);
    const end =
      hardEnd === text.length
        ? hardEnd
        : (lastBreak(text, start + CHUNK_TARGET_CHARS / 2, hardEnd) ?? hardEnd);
    const chunkText = text.slice(start, end);
    if (chunkText.trim()) {
      chunks.push({
        page: page.page,
        ordinal: chunks.length,
        start,
        end,
        text: chunkText,
      });
    }
    if (end === text.length) break;
    start = Math.min(
      nextWordStart(text, Math.max(end - CHUNK_OVERLAP_CHARS, start + 1)),
      end,
    );
  }
  return chunks;
}

function lastBreak(text: string, from: number, to: number): number | null {
  for (const separator of SEPARATORS) {
    const at = text.lastIndexOf(separator, to - separator.length);
    if (at >= from) return at + separator.length;
  }
  return null;
}

function nextWordStart(text: string, from: number): number {
  if (from === 0 || /\s/.test(text[from - 1])) return from;
  const space = text.slice(from).search(/\s/);
  return space === -1 ? from : from + space + 1;
}
