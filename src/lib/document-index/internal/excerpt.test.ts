import { describe, expect, test } from "bun:test";
import { excerptFor } from "./excerpt";

const PAGE = [
  "Chapter 3. Getting started with Spring AI.",
  "Spring Boot auto-configures a ChatClient bean once the starter dependency is on the classpath.",
  "Vector stores such as PGVector persist embeddings for retrieval augmented generation.",
].join("\n");

describe("excerptFor", () => {
  test("picks the sentence that supports the claim, not the page's first sentence", () => {
    expect(
      excerptFor(
        ["Embeddings are persisted in a vector store like PGVector"],
        PAGE,
      ),
    ).toBe(
      "Vector stores such as PGVector persist embeddings for retrieval augmented generation.",
    );
  });

  test("extends a short best sentence with the one after it", () => {
    expect(excerptFor(["Read chapter three to get started"], PAGE)).toBe(
      "Chapter 3. Getting started with Spring AI.",
    );
    expect(
      excerptFor(
        ["Spring AI basics"],
        "Spring AI basics. Next it covers clients.",
      ),
    ).toBe("Spring AI basics. Next it covers clients.");
  });

  test("returns null when no sentence shares a content word with the claim", () => {
    expect(
      excerptFor(["Kubernetes operators reconcile clusters"], PAGE),
    ).toBeNull();
  });

  test("caps long sentences with an ellipsis", () => {
    const excerpt = excerptFor(["alpha"], `alpha ${"word ".repeat(100)}`);
    expect(excerpt).toHaveLength(280);
    expect(excerpt?.endsWith("…")).toBe(true);
  });
});
