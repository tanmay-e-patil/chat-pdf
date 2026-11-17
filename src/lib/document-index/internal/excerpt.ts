const EXCERPT_CHARS = 280;
const SHORT_SENTENCE_CHARS = 80;
const SENTENCE_BREAK = /(?<=[.!?])\s+|\n+/;
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "was",
  "were",
  "with",
  "that",
  "this",
  "from",
  "has",
  "have",
  "its",
  "not",
  "but",
  "can",
  "into",
  "than",
  "then",
  "they",
  "their",
  "which",
  "also",
  "will",
  "been",
]);

// The page sentence sharing the most content words with the claims, or null when none share any.
export function excerptFor(claims: string[], pageText: string): string | null {
  const claimTokens = tokens(claims.join(" "));
  const sentences = pageText
    .split(SENTENCE_BREAK)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  let best = -1;
  let bestScore = 0;
  sentences.forEach((sentence, index) => {
    let score = 0;
    for (const token of tokens(sentence)) if (claimTokens.has(token)) score++;
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  });
  if (best < 0) return null;
  let excerpt = sentences[best];
  if (excerpt.length < SHORT_SENTENCE_CHARS && best + 1 < sentences.length) {
    excerpt += ` ${sentences[best + 1]}`;
  }
  return excerptOf(excerpt);
}

export function excerptOf(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= EXCERPT_CHARS
    ? flat
    : `${flat.slice(0, EXCERPT_CHARS - 1)}…`;
}

function tokens(text: string): Set<string> {
  const words = text.toLowerCase().match(/\p{L}{3,}/gu) ?? [];
  return new Set(words.filter((word) => !STOPWORDS.has(word)));
}
