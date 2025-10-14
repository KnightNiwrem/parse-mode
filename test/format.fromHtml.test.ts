import { assertEquals, describe, it } from "./deps.test.ts";
import { FormattedString } from "../src/format.ts";

describe("FormattedString.fromHtml", () => {
  it("parses basic formatting tags", () => {
    const result = FormattedString.fromHtml("<b>bold</b><i>italic</i>");

    assertEquals(result.rawText, "bolditalic");
    assertEquals(result.rawEntities, [
      { type: "bold", offset: 0, length: 4 },
      { type: "italic", offset: 4, length: 6 },
    ]);
  });

  it("supports tag aliases", () => {
    const html =
      "<strong>a</strong><em>b</em><ins>c</ins><del>d</del><strike>e</strike>";
    const result = FormattedString.fromHtml(html);

    assertEquals(result.rawText, "abcde");
    assertEquals(result.rawEntities, [
      { type: "bold", offset: 0, length: 1 },
      { type: "italic", offset: 1, length: 1 },
      { type: "underline", offset: 2, length: 1 },
      { type: "strikethrough", offset: 3, length: 1 },
      { type: "strikethrough", offset: 4, length: 1 },
    ]);
  });

  it("handles nested tags", () => {
    const result = FormattedString.fromHtml(
      "<b>bold <i>italic</i></b>",
    );

    assertEquals(result.rawText, "bold italic");
    const normalized = [...result.rawEntities].sort((a, b) => {
      if (a.offset !== b.offset) {
        return a.offset - b.offset;
      }
      if (a.length !== b.length) {
        return a.length - b.length;
      }
      return a.type.localeCompare(b.type);
    });
    assertEquals(normalized, [
      { type: "bold", offset: 0, length: 11 },
      { type: "italic", offset: 5, length: 6 },
    ]);
  });

  it("parses spoiler, code, pre, and blockquote", () => {
    const html =
      "<tg-spoiler>secret</tg-spoiler><code>inline</code><pre>block</pre><blockquote>quote</blockquote>";
    const result = FormattedString.fromHtml(html);

    assertEquals(result.rawText, "secretinlineblockquote");
    assertEquals(result.rawEntities, [
      { type: "spoiler", offset: 0, length: 6 },
      { type: "code", offset: 6, length: 6 },
      { type: "pre", offset: 12, length: 5 },
      { type: "blockquote", offset: 17, length: 5 },
    ]);
  });

  it("treats unknown tags as text", () => {
    const html = "<custom>tag</custom>";
    const result = FormattedString.fromHtml(html);

    assertEquals(result.rawText, "<custom>tag</custom>");
    assertEquals(result.rawEntities.length, 0);
  });

  it("instance method proxies to static implementation", () => {
    const formatted = new FormattedString("baseline");
    const result = formatted.fromHtml("<b>text</b>");

    assertEquals(result.rawText, "text");
    assertEquals(result.rawEntities, [
      { type: "bold", offset: 0, length: 4 },
    ]);
  });
});
