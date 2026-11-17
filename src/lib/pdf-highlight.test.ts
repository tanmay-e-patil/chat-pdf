import { describe, expect, test } from "bun:test";
import { locateExcerpt } from "./pdf-highlight";

const marked = (items: string[], excerpt: string) =>
  locateExcerpt(items, excerpt)?.map(({ item, start, end }) =>
    items[item].slice(start, end),
  ) ?? null;

describe("locateExcerpt", () => {
  test("spans several text items", () => {
    const items = [
      "Intro text. Spring AI ",
      "wraps model",
      " APIs cleanly. Outro.",
    ];
    expect(locateExcerpt(items, "Spring AI wraps model APIs cleanly.")).toEqual(
      [
        { item: 0, start: 12, end: 21 },
        { item: 1, start: 0, end: 11 },
        { item: 2, start: 1, end: 13 },
      ],
    );
  });

  test("matches a word the server dehyphenated across a line break", () => {
    expect(
      marked(["for exam-", "ple the client"], "for example the client"),
    ).toEqual(["for exam", "ple the client"]);
  });

  test("ignores whitespace differences and a trailing ellipsis", () => {
    expect(
      marked(
        ["The   ChatClient\tbuilds prompts fluently"],
        "The ChatClient builds prompts flu…",
      ),
    ).toEqual(["The   ChatClient\tbuilds prompts flu"]);
  });

  test("falls back to a prefix when the excerpt's tail differs from the page", () => {
    const sentence =
      "Vector stores such as PGVector persist embeddings for retrieval";
    expect(marked([sentence], `${sentence} with a garbled ﬀ✖ tail`)).toEqual([
      sentence,
    ]);
  });

  test("returns null when the excerpt is not on the page", () => {
    expect(
      locateExcerpt(
        ["Nothing relevant here."],
        "Kubernetes operators reconcile clusters",
      ),
    ).toBeNull();
  });
});
