// Character range [start, end) within the pdf.js text item at index `item`.
export type HighlightRange = { item: number; start: number; end: number };

const MIN_MATCH_CHARS = 40;
const WORD_CHAR = /[\p{L}\p{N}]/u;

// Matching on letters and digits alone absorbs the server's dehyphenation, whitespace
// collapsing, and ellipsis truncation. A prefix fallback survives odd glyphs mid-excerpt.
export function locateExcerpt(
  items: string[],
  excerpt: string,
): HighlightRange[] | null {
  const origins: HighlightRange[] = [];
  let haystack = "";
  items.forEach((text, item) => {
    let start = 0;
    for (const char of text) {
      const end = start + char.length;
      for (const folded of fold(char)) {
        haystack += folded;
        origins.push({ item, start, end });
      }
      start = end;
    }
  });

  const needle = [...excerpt.replace(/…\s*$/, "")].flatMap(fold).join("");
  // Every prefix of a present prefix is present too, so binary search the longest one.
  let found = -1;
  let low = Math.min(MIN_MATCH_CHARS, needle.length);
  let high = needle.length;
  while (low <= high && high > 0) {
    const length = (low + high) >> 1;
    const hit = haystack.indexOf(needle.slice(0, length));
    if (hit >= 0) {
      found = hit;
      low = length + 1;
    } else {
      high = length - 1;
    }
  }
  return found >= 0 ? toRanges(origins.slice(found, found + high)) : null;
}

function fold(char: string): string[] {
  return [...char.normalize("NFKC").toLowerCase()].filter((c) =>
    WORD_CHAR.test(c),
  );
}

function toRanges(origins: HighlightRange[]): HighlightRange[] {
  const ranges: HighlightRange[] = [];
  for (const { item, start, end } of origins) {
    const last = ranges.at(-1);
    if (last?.item === item) last.end = Math.max(last.end, end);
    else ranges.push({ item, start, end });
  }
  return ranges;
}
