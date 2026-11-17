import { describe, expect, test } from "bun:test";
import { citedClaims } from "./shared";

describe("citedClaims", () => {
  test("maps each cited page to the sentence fragment before its marker", () => {
    const answer =
      "Spring AI wraps model APIs [p. 2]. It also ships vector stores [p. 5], and an ETL pipeline [p. 5].\n- Retries are built in [page 7]";
    expect([...citedClaims(answer)]).toEqual([
      [2, ["Spring AI wraps model APIs"]],
      [5, ["It also ships vector stores", ", and an ETL pipeline"]],
      [7, ["- Retries are built in"]],
    ]);
  });

  test("a marker after the period backs that sentence, and stacked markers share a claim", () => {
    const answer = "First claim. Second claim here. [p. 3][p. 4]";
    expect([...citedClaims(answer)]).toEqual([
      [3, ["Second claim here"]],
      [4, ["Second claim here"]],
    ]);
  });
});
