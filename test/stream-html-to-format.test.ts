import { assertEquals, assertInstanceOf, describe, it } from "./deps.test.ts";
import type { MessageEntity } from "../src/deps.deno.ts";
import { FormattedString } from "../src/format.ts";
import {
  HTMLStreamParser,
  isDecodableCodePoint,
  isValidCodePoint,
  maxCodePoint,
} from "../src/stream-html-to-format.ts";

describe("HTMLStreamParser", () => {
  it("maps pre/code language class to pre.language", () => {
    const parser = new HTMLStreamParser();
    const input =
      '<pre><code class="language-python">pre-formatted fixed-width code block written in the Python programming language</code></pre>';

    parser.add(input);
    const formatted = parser.toFormattedString();

    assertInstanceOf(formatted, FormattedString);
    assertEquals(
      formatted.rawText,
      "pre-formatted fixed-width code block written in the Python programming language",
    );
    assertEquals(formatted.rawEntities.length, 1);

    const entity = formatted.rawEntities[0];
    if (!entity || entity.type !== "pre") {
      throw new Error("Expected a pre entity");
    }

    assertEquals(entity.offset, 0);
    assertEquals(entity.length, formatted.rawText.length);
    assertEquals(entity.language, "python");
  });

  it("maps span tg-spoiler class to spoiler entity", () => {
    const parser = new HTMLStreamParser();
    parser.add('<span class="tg-spoiler">spoiler</span>');

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "spoiler");
    assertEquals(formatted.rawEntities.length, 1);
    assertEquals(formatted.rawEntities[0]?.type, "spoiler");
    assertEquals(formatted.rawEntities[0]?.offset, 0);
    assertEquals(formatted.rawEntities[0]?.length, "spoiler".length);
  });

  it("maps expandable blockquote correctly", () => {
    const parser = new HTMLStreamParser();
    const quoteText =
      "Expandable block quotation started\nExpandable block quotation continued\nExpandable block quotation continued\nHidden by default part of the block quotation started\nExpandable block quotation continued\nThe last line of the block quotation";

    parser.add(`<blockquote expandable>${quoteText}</blockquote>`);
    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, quoteText);
    assertEquals(formatted.rawEntities.length, 1);
    assertEquals(formatted.rawEntities[0]?.type, "expandable_blockquote");
    assertEquals(formatted.rawEntities[0]?.offset, 0);
    assertEquals(formatted.rawEntities[0]?.length, quoteText.length);
  });

  it("maps tg-emoji to custom_emoji", () => {
    const parser = new HTMLStreamParser();
    parser.add('<tg-emoji emoji-id="5368324170671202286">🙂</tg-emoji>');

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "🙂");
    assertEquals(formatted.rawEntities.length, 1);
    const entity = formatted.rawEntities[0];
    if (!entity || entity.type !== "custom_emoji") {
      throw new Error("Expected a custom_emoji entity");
    }
    assertEquals(entity.offset, 0);
    assertEquals(entity.length, "🙂".length);
    assertEquals(entity.custom_emoji_id, "5368324170671202286");
  });

  it("maps links to text_link entities", () => {
    const parser = new HTMLStreamParser();
    parser.add('<a href="https://grammy.dev">grammY</a>');

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "grammY");
    assertEquals(formatted.rawEntities.length, 1);
    const entity = formatted.rawEntities[0];
    if (!entity || entity.type !== "text_link") {
      throw new Error("Expected a text_link entity");
    }
    assertEquals(entity.offset, 0);
    assertEquals(entity.length, "grammY".length);
    assertEquals(entity.url, "https://grammy.dev");
  });

  it("accepts closing tags with trailing whitespace before >", () => {
    const parser = new HTMLStreamParser();
    parser.add("<b>bold text</b   >");

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "bold text");
    assertEquals(formatted.rawEntities.length, 1);
    assertEquals(formatted.rawEntities[0]?.type, "bold");
    assertEquals(formatted.rawEntities[0]?.offset, 0);
    assertEquals(formatted.rawEntities[0]?.length, "bold text".length);
  });

  it("accepts opening tags with trailing whitespace before >", () => {
    const parser = new HTMLStreamParser();
    parser.add("<blockquote expandable       >quote</blockquote>");

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "quote");
    assertEquals(formatted.rawEntities.length, 1);
    assertEquals(formatted.rawEntities[0]?.type, "expandable_blockquote");
    assertEquals(formatted.rawEntities[0]?.offset, 0);
    assertEquals(formatted.rawEntities[0]?.length, "quote".length);
  });

  it("supports streamed chunk boundaries across tags and entities", () => {
    const parser = new HTMLStreamParser();
    parser.add('<span class="tg-');
    parser.add('spoiler">spoiler &');
    parser.add("amp; text</span>");

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "spoiler & text");
    assertEquals(formatted.rawEntities.length, 1);
    assertEquals(formatted.rawEntities[0]?.type, "spoiler");
    assertEquals(formatted.rawEntities[0]?.offset, 0);
    assertEquals(formatted.rawEntities[0]?.length, "spoiler & text".length);
  });

  it("evaluates contiguous opening brackets as plain text", () => {
    const parser = new HTMLStreamParser();
    parser.add("<<b");
    parser.add(">bold</b>");

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "<bold");
    assertEquals(formatted.rawEntities.length, 1);
    assertEquals(formatted.rawEntities[0]?.type, "bold");
    assertEquals(formatted.rawEntities[0]?.offset, 1);
    assertEquals(formatted.rawEntities[0]?.length, 4);
  });

  it("flushes partial open tag and restarts on <: <b<b>bold</b>", () => {
    const parser = new HTMLStreamParser();
    parser.add("<b<b>bold</b>");

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "<bbold");
    assertEquals(formatted.rawEntities.length, 1);
    assertEquals(formatted.rawEntities[0]?.type, "bold");
    assertEquals(formatted.rawEntities[0]?.offset, 2);
    assertEquals(formatted.rawEntities[0]?.length, 4);
  });

  it("flushes partial open tag across stream boundary: <b then <b>bold</b>", () => {
    const parser = new HTMLStreamParser();
    parser.add("<b");
    parser.add("<b>bold</b>");

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "<bbold");
    assertEquals(formatted.rawEntities.length, 1);
    assertEquals(formatted.rawEntities[0]?.type, "bold");
    assertEquals(formatted.rawEntities[0]?.offset, 2);
    assertEquals(formatted.rawEntities[0]?.length, 4);
  });

  it("flushes partial open tag for different tags: <i<b>bold</b>", () => {
    const parser = new HTMLStreamParser();
    parser.add("<i<b>bold</b>");

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "<ibold");
    assertEquals(formatted.rawEntities.length, 1);
    assertEquals(formatted.rawEntities[0]?.type, "bold");
    assertEquals(formatted.rawEntities[0]?.offset, 2);
    assertEquals(formatted.rawEntities[0]?.length, 4);
  });

  it("flushes partial close tag and restarts on <: <b>bold</</b>", () => {
    const parser = new HTMLStreamParser();
    parser.add("<b>bold</</b>");

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "bold</");
    assertEquals(formatted.rawEntities.length, 1);
    assertEquals(formatted.rawEntities[0]?.type, "bold");
    assertEquals(formatted.rawEntities[0]?.offset, 0);
    assertEquals(formatted.rawEntities[0]?.length, 6);
  });

  it("flushes partial close tag mid-name: <b>bold</b<b>more</b>", () => {
    const parser = new HTMLStreamParser();
    parser.add("<b>bold</b<b>more</b>");

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "bold</bmore");
    assertEquals(formatted.rawEntities.length, 1);
    assertEquals(formatted.rawEntities[0]?.type, "bold");
    assertEquals(formatted.rawEntities[0]?.offset, 7);
    assertEquals(formatted.rawEntities[0]?.length, 4);
  });

  it("maps tg-time to date_time with unix attribute", () => {
    const parser = new HTMLStreamParser();
    parser.add('<tg-time unix="1773412200">2026-05-21</tg-time>');

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "2026-05-21");
    assertEquals(formatted.rawEntities.length, 1);
    const entity = formatted.rawEntities[0] as
      | MessageEntity.DateTimeMessageEntity
      | undefined;
    assertEquals(entity?.type, "date_time");
    assertEquals(entity?.offset, 0);
    assertEquals(entity?.length, "2026-05-21".length);
    assertEquals(entity?.unix_time, 1773412200);
    assertEquals(entity?.date_time_format, "");
  });

  it("maps tg-time to date_time with unix and format attributes", () => {
    const parser = new HTMLStreamParser();
    parser.add(
      '<tg-time unix="1773412200" format="d">2026-05-21</tg-time>',
    );

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "2026-05-21");
    assertEquals(formatted.rawEntities.length, 1);
    const entity = formatted.rawEntities[0] as
      | MessageEntity.DateTimeMessageEntity
      | undefined;
    assertEquals(entity?.type, "date_time");
    assertEquals(entity?.offset, 0);
    assertEquals(entity?.length, "2026-05-21".length);
    assertEquals(entity?.unix_time, 1773412200);
    assertEquals(entity?.date_time_format, "d");
  });

  it("does not map invalid tg-time (missing unix attribute)", () => {
    const parser = new HTMLStreamParser();
    parser.add("<tg-time>invalid</tg-time>");

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "<tg-time>invalid</tg-time>");
    assertEquals(formatted.rawEntities.length, 0);
  });

  it("does not map invalid tg-time (non-numeric unix attribute)", () => {
    const parser = new HTMLStreamParser();
    parser.add('<tg-time unix="abc">invalid</tg-time>');

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, '<tg-time unix="abc">invalid</tg-time>');
    assertEquals(formatted.rawEntities.length, 0);
  });

  it("does not map invalid tg-time (partially numeric unix attribute)", () => {
    const parser = new HTMLStreamParser();
    parser.add('<tg-time unix="1773412200abc">invalid</tg-time>');

    const formatted = parser.toFormattedString();

    assertEquals(
      formatted.rawText,
      '<tg-time unix="1773412200abc">invalid</tg-time>',
    );
    assertEquals(formatted.rawEntities.length, 0);
  });

  it("does not map invalid tg-time (scientific notation unix attribute)", () => {
    const parser = new HTMLStreamParser();
    parser.add('<tg-time unix="1e6">invalid</tg-time>');

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, '<tg-time unix="1e6">invalid</tg-time>');
    assertEquals(formatted.rawEntities.length, 0);
  });

  it("does not map invalid tg-time (invalid format grammar)", () => {
    const parser = new HTMLStreamParser();
    parser.add(
      '<tg-time unix="1773412200" format="yyyy-MM-dd">invalid</tg-time>',
    );

    const formatted = parser.toFormattedString();

    assertEquals(
      formatted.rawText,
      '<tg-time unix="1773412200" format="yyyy-MM-dd">invalid</tg-time>',
    );
    assertEquals(formatted.rawEntities.length, 0);
  });

  it("does not map invalid tg-time (extremely large non-finite unix attribute)", () => {
    const parser = new HTMLStreamParser();
    const largeUnix = "9".repeat(310);
    parser.add(`<tg-time unix="${largeUnix}">invalid</tg-time>`);

    const formatted = parser.toFormattedString();

    assertEquals(
      formatted.rawText,
      `<tg-time unix="${largeUnix}">invalid</tg-time>`,
    );
    assertEquals(formatted.rawEntities.length, 0);
  });

  it("toFormattedString is idempotent for unchanged parser state", () => {
    const parser = new HTMLStreamParser();
    parser.add("<i>ok</i>");

    const first = parser.toFormattedString();
    const second = parser.toFormattedString();

    assertEquals(second.rawText, first.rawText);
    assertEquals(second.rawEntities, first.rawEntities);
  });

  it("decodes decimal and hexadecimal numeric entities including astral code points", () => {
    const parser = new HTMLStreamParser();
    parser.add(
      "&#65; &#x3a; &#X3A; &#128512; &#x1f600; &#X1F600; &#x10FFFE; &#x10FFFF;",
    );

    const formatted = parser.toFormattedString();

    // U+10FFFF is not decodable (decision 11), so it stays literal text
    assertEquals(
      formatted.rawText,
      `A : : 😀 😀 😀 ${String.fromCodePoint(maxCodePoint - 1)} &#x10FFFF;`,
    );
    assertEquals(formatted.rawEntities.length, 0);
  });

  it("preserves UTF-16 entity offsets and lengths for astral numeric entities", () => {
    const parser = new HTMLStreamParser();
    parser.add("<b>&#128512;</b><i>&#x1F600;ok</i>");

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "😀😀ok");
    assertEquals(formatted.rawEntities, [
      { type: "bold", offset: 0, length: 2 },
      { type: "italic", offset: 2, length: 4 },
    ]);
  });

  it("supports streamed chunk boundaries across astral numeric entities", () => {
    const parser = new HTMLStreamParser();
    parser.add("&");
    parser.add("#128");
    parser.add("512; &#");
    parser.add("x1F");
    parser.add("600;");

    const formatted = parser.toFormattedString();

    assertEquals(formatted.rawText, "😀 😀");
    assertEquals(formatted.rawEntities.length, 0);
  });

  it("falls back to plaintext for out-of-range, surrogate, and empty numeric entities", () => {
    const parser = new HTMLStreamParser();
    const hugeDecimal = "9".repeat(400);
    parser.add(
      `&#1114112; &#x110000; &#${hugeDecimal}; &#55296; &#xD800; &#xDFFF; &#; &#x; &#X;`,
    );

    const formatted = parser.toFormattedString();

    assertEquals(
      formatted.rawText,
      `&#1114112; &#x110000; &#${hugeDecimal}; &#55296; &#xD800; &#xDFFF; &#; &#x; &#X;`,
    );
    assertEquals(formatted.rawEntities.length, 0);
  });

  it("validates Unicode scalar code points via isValidCodePoint", () => {
    assertEquals(isValidCodePoint(0), true);
    assertEquals(isValidCodePoint(0xd7ff), true);
    assertEquals(isValidCodePoint(0xd800), false);
    assertEquals(isValidCodePoint(0xdfff), false);
    assertEquals(isValidCodePoint(0xe000), true);
    assertEquals(isValidCodePoint(0x1f600), true);
    assertEquals(isValidCodePoint(maxCodePoint), true);
    assertEquals(isValidCodePoint(maxCodePoint + 1), false);
    assertEquals(isValidCodePoint(-1), false);
    assertEquals(isValidCodePoint(1.5), false);
    assertEquals(isValidCodePoint(NaN), false);
    assertEquals(isValidCodePoint(Infinity), false);
  });
});

// ---------------------------------------------------------------------------
// Helpers for the parser behaviour tests
// ---------------------------------------------------------------------------

type Result = { text: string; entities: MessageEntity[] };
type Snapshots = { intermediate: Result; ended: Result };

function snapshotsOf(parser: HTMLStreamParser): Snapshots {
  const intermediate = parser.toFormattedString();
  const ended = parser.toFormattedString({ ended: true });
  return {
    intermediate: {
      text: intermediate.rawText,
      entities: intermediate.rawEntities,
    },
    ended: { text: ended.rawText, entities: ended.rawEntities },
  };
}

/** Feeds `chunks` in order, taking both snapshots between chunks. */
function parseChunks(chunks: string[]): Snapshots {
  const parser = new HTMLStreamParser();
  for (const chunk of chunks) {
    parser.add(chunk);
    // Snapshots between chunks must not disturb parsing
    parser.toFormattedString();
    parser.toFormattedString({ ended: true });
  }
  return snapshotsOf(parser);
}

/**
 * Feeds `input` whole, one character (code point) at a time, and split in
 * two at every character boundary, and asserts that every chunking gives
 * the same result for both snapshots.
 */
function parseEveryChunking(input: string): Snapshots {
  const whole = parseChunks([input]);
  const chars = Array.from(input);
  assertEquals(parseChunks(chars), whole, `char by char: ${input}`);
  for (let i = 1; i < chars.length; i++) {
    const head = chars.slice(0, i).join("");
    const tail = chars.slice(i).join("");
    assertEquals(parseChunks([head, tail]), whole, `split at ${i}: ${input}`);
  }
  return whole;
}

/** Asserts both snapshots of `input` under every chunking. */
function expectParse(
  input: string,
  intermediate: Result,
  ended: Result = intermediate,
): void {
  const result = parseEveryChunking(input);
  assertEquals(result.intermediate, intermediate, `intermediate: ${input}`);
  assertEquals(result.ended, ended, `ended: ${input}`);
}

/** Asserts that `input` stays literal text with no entities. */
function expectLiteral(input: string): void {
  expectParse(input, { text: input, entities: [] });
}

const link = (offset: number, length: number, url: string): MessageEntity => ({
  type: "text_link",
  offset,
  length,
  url,
});

// ---------------------------------------------------------------------------
// Parser behaviour, one block per decision in docs/HTML.md
// ---------------------------------------------------------------------------

describe("HTMLStreamParser decisions", () => {
  it("1: decodes references in quoted and unquoted attribute values", () => {
    expectParse('<a href="?a=1&amp;b=2">x</a>', {
      text: "x",
      entities: [link(0, 1, "?a=1&b=2")],
    });
    expectParse("<a href='&lt;&#65;&#x42;&quot;'>x</a>", {
      text: "x",
      entities: [link(0, 1, '<AB"')],
    });
    expectParse("<a href=?a&amp;b>x</a>", {
      text: "x",
      entities: [link(0, 1, "?a&b")],
    });
  });

  it("1: keeps a failed reference in an attribute value as raw characters", () => {
    expectParse('<a href="a&b&amp &#xZ;&#0;&">x</a>', {
      text: "x",
      entities: [link(0, 1, "a&b&amp &#xZ;&#0;&")],
    });
    expectParse("<a href=a&amp>x</a>", {
      text: "x",
      entities: [link(0, 1, "a&amp")],
    });
  });

  it("2: requires the semicolon on references", () => {
    expectLiteral("AT&amp T");
    expectLiteral("&AMP; &ampx; &am; &#65 &#x41 end");
    expectParse("&lt;b&gt; &quot;", { text: '<b> "', entities: [] });
    expectParse("&amp<b>x</b>", {
      text: "&ampx",
      entities: [{ type: "bold", offset: 4, length: 1 }],
    });
    expectParse("&&amp;", { text: "&&", entities: [] });
  });

  it("3: leaves undecided input out of the intermediate snapshot only", () => {
    expectParse(
      "tail &amp",
      { text: "tail ", entities: [] },
      { text: "tail &amp", entities: [] },
    );
    expectParse(
      "tail <b",
      { text: "tail ", entities: [] },
      { text: "tail <b", entities: [] },
    );
    expectParse(
      '<a href="x',
      { text: "", entities: [] },
      { text: '<a href="x', entities: [] },
    );
    expectParse(
      '<a href="a&am',
      { text: "", entities: [] },
      { text: '<a href="a&am', entities: [] },
    );
    expectParse(
      "x &#12",
      { text: "x ", entities: [] },
      { text: "x &#12", entities: [] },
    );
    expectParse(
      "<b>x</b  ",
      { text: "x", entities: [] },
      { text: "<b>x</b  ", entities: [] },
    );
  });

  it("4: never creates an entity for an unclosed tag", () => {
    expectParse(
      "<b>unclosed",
      { text: "unclosed", entities: [] },
      { text: "<b>unclosed", entities: [] },
    );
    expectParse(
      "<i>a</i><b>b",
      { text: "ab", entities: [{ type: "italic", offset: 0, length: 1 }] },
      { text: "a<b>b", entities: [{ type: "italic", offset: 0, length: 1 }] },
    );
    expectParse(
      "<b>x</b><i>y&am",
      { text: "xy", entities: [{ type: "bold", offset: 0, length: 1 }] },
      { text: "x<i>y&am", entities: [{ type: "bold", offset: 0, length: 1 }] },
    );
  });

  it("4: shifts or grows finished entities around restored start tags", () => {
    // `<b>` comes before the italic in source: the italic shifts
    expectParse(
      "<b><i>x</i>",
      { text: "x", entities: [{ type: "italic", offset: 0, length: 1 }] },
      { text: "<b>x", entities: [{ type: "italic", offset: 3, length: 1 }] },
    );
    // `<b>` is inside the italic in source: the italic grows
    expectParse(
      "<i><b>x</i>",
      { text: "x", entities: [{ type: "italic", offset: 0, length: 1 }] },
      { text: "<b>x", entities: [{ type: "italic", offset: 0, length: 4 }] },
    );
    expectParse(
      "<i>a<b>b</i>c",
      { text: "abc", entities: [{ type: "italic", offset: 0, length: 2 }] },
      { text: "a<b>bc", entities: [{ type: "italic", offset: 0, length: 5 }] },
    );
    expectParse(
      '<a href="u">a<b>b</a>',
      { text: "ab", entities: [link(0, 2, "u")] },
      { text: "a<b>b", entities: [link(0, 5, "u")] },
    );
    // Several unclosed tags at once
    expectParse(
      "<b>a<i>b<u>c</u>d",
      {
        text: "abcd",
        entities: [{ type: "underline", offset: 2, length: 1 }],
      },
      {
        text: "<b>a<i>bcd",
        entities: [{ type: "underline", offset: 8, length: 1 }],
      },
    );
    expectParse(
      "<s>a<b><i>b</s><u>c</u>",
      {
        text: "abc",
        entities: [
          { type: "strikethrough", offset: 0, length: 2 },
          { type: "underline", offset: 2, length: 1 },
        ],
      },
      {
        text: "a<b><i>bc",
        entities: [
          { type: "strikethrough", offset: 0, length: 8 },
          { type: "underline", offset: 8, length: 1 },
        ],
      },
    );
  });

  it("5: creates no entity for a tag pair covering no characters", () => {
    expectParse("<b></b>x<i><u></u></i>", { text: "x", entities: [] });
    expectParse('<a href="u"></a>', { text: "", entities: [] });
  });

  it("6: keeps an end tag without a name as literal text", () => {
    expectLiteral("</>");
    expectLiteral("</ >");
    expectParse(
      "<b>x</>",
      { text: "x</>", entities: [] },
      { text: "<b>x</>", entities: [] },
    );
  });

  it("7: merges pre and code with a language over the same range", () => {
    const pre = { type: "pre", offset: 0, length: 1, language: "x" };
    expectParse('<pre><code class="language-x">a</code></pre>', {
      text: "a",
      entities: [pre as MessageEntity],
    });
    expectParse('<code class="language-x"><pre>a</pre></code>', {
      text: "a",
      entities: [pre as MessageEntity],
    });
  });

  it("7: keeps pre and code separate otherwise, code without language", () => {
    expectParse("<pre><code>b</code></pre>", {
      text: "b",
      entities: [
        { type: "code", offset: 0, length: 1 },
        { type: "pre", offset: 0, length: 1 },
      ],
    });
    expectParse('<pre>a<code class="language-x">b</code></pre>', {
      text: "ab",
      entities: [
        { type: "pre", offset: 0, length: 2 },
        { type: "code", offset: 1, length: 1 },
      ],
    });
    expectParse('<pre><code class="language-x">a</code>b</pre>', {
      text: "ab",
      entities: [
        { type: "code", offset: 0, length: 1 },
        { type: "pre", offset: 0, length: 2 },
      ],
    });
    expectParse('<code class="language-x">a</code>', {
      text: "a",
      entities: [{ type: "code", offset: 0, length: 1 }],
    });
  });

  it("8: keeps the first value of a duplicate attribute", () => {
    expectParse('<a href="1" href="2">x</a>', {
      text: "x",
      entities: [link(0, 1, "1")],
    });
    expectParse("<a href=1 HREF='2' href>x</a>", {
      text: "x",
      entities: [link(0, 1, "1")],
    });
  });

  it("9: keeps &#0; and &#x0; as literal text", () => {
    expectLiteral("&#0; &#x0; &#000; &#X00;");
  });

  it("10: decodes numeric references of any length", () => {
    expectParse("&#000000065;&#x0000000042;", { text: "AB", entities: [] });
  });

  it("11: keeps &#x10FFFF; as literal text", () => {
    expectParse("&#x10FFFF;&#1114111;&#x10FFFE;", {
      text: `&#x10FFFF;&#1114111;${String.fromCodePoint(0x10fffe)}`,
      entities: [],
    });
  });

  it("11: checks decodable code points separately from Unicode scalars", () => {
    assertEquals(isDecodableCodePoint(0), false);
    assertEquals(isDecodableCodePoint(1), true);
    assertEquals(isDecodableCodePoint(0xd7ff), true);
    assertEquals(isDecodableCodePoint(0xd800), false);
    assertEquals(isDecodableCodePoint(0xdfff), false);
    assertEquals(isDecodableCodePoint(0x10fffe), true);
    assertEquals(isDecodableCodePoint(maxCodePoint), false);
    assertEquals(isDecodableCodePoint(maxCodePoint + 1), false);
    assertEquals(isDecodableCodePoint(-1), false);
    assertEquals(isDecodableCodePoint(1.5), false);
    assertEquals(isDecodableCodePoint(NaN), false);
  });

  it("12: ignores anything after an end tag name up to >", () => {
    expectParse("<b>x</b foo>", {
      text: "x",
      entities: [{ type: "bold", offset: 0, length: 1 }],
    });
    expectParse('<b>x</b class="y" / >', {
      text: "x",
      entities: [{ type: "bold", offset: 0, length: 1 }],
    });
  });

  it("12: keeps slash, quote or = where a name is expected as literal text", () => {
    expectLiteral("<b />x");
    expectLiteral("<b/>x");
    expectLiteral("<b =x>y");
    expectLiteral('<b x"y>z');
    expectLiteral('<a href="u"/>x');
  });

  it("13: returns entities sorted with sortEntities", () => {
    expectParse("<b><i>a</i>b</b>", {
      text: "ab",
      entities: [
        { type: "italic", offset: 0, length: 1 },
        { type: "bold", offset: 0, length: 2 },
      ],
    });
    // Equal ranges are ordered by type, not by closing order
    const sameRange = [
      { type: "bold", offset: 0, length: 1 },
      { type: "italic", offset: 0, length: 1 },
    ] as MessageEntity[];
    expectParse("<b><i>x</i></b>", { text: "x", entities: sameRange });
    expectParse("<i><b>x</b></i>", { text: "x", entities: sameRange });
  });

  it("14: reads unquoted values up to whitespace or >, keeping case", () => {
    expectParse("<a href=https://E.com/A?b&amp;c>x</a>", {
      text: "x",
      entities: [link(0, 1, "https://E.com/A?b&c")],
    });
    expectParse("<a href= u >x</a>", {
      text: "x",
      entities: [link(0, 1, "u")],
    });
    expectParse("<blockquote expandable=yes>q</blockquote>", {
      text: "q",
      entities: [{ type: "expandable_blockquote", offset: 0, length: 1 }],
    });
  });

  it("14: keeps malformed unquoted values as literal text", () => {
    expectLiteral('<a href=x"y>z</a>');
    expectLiteral("<a href=x'y>z</a>");
    expectLiteral("<a href=x<y>z</a>");
    expectLiteral("<a href=x=y>z</a>");
    expectLiteral("<a href=https://e.com/?a=1>z</a>");
    expectLiteral("<a href=x`y>z</a>");
    expectLiteral("<a href=>z</a>");
    expectLiteral("<a href= >z</a>");
  });

  it("15: reads tag and attribute names case-insensitively", () => {
    expectParse('<A HREF="u">x</A>', {
      text: "x",
      entities: [link(0, 1, "u")],
    });
    expectParse("<BLOCKQUOTE Expandable>q</blockquote>", {
      text: "q",
      entities: [{ type: "expandable_blockquote", offset: 0, length: 1 }],
    });
  });

  it("16: reads class as a whitespace-separated token list", () => {
    const spoiler: MessageEntity = { type: "spoiler", offset: 0, length: 1 };
    expectParse('<span class="foo tg-spoiler">s</span>', {
      text: "s",
      entities: [spoiler],
    });
    expectParse("<span class=tg-spoiler>s</span>", {
      text: "s",
      entities: [spoiler],
    });
    expectLiteral('<span class="tg-spoilers">s</span>');
    expectLiteral("<span>s</span>");
    expectParse('<pre><code class="x language-py">p</code></pre>', {
      text: "p",
      entities: [
        { type: "pre", offset: 0, length: 1, language: "py" } as MessageEntity,
      ],
    });
    expectParse(
      '<pre><code class="language- language-go extra">p</code></pre>',
      {
        text: "p",
        entities: [
          {
            type: "pre",
            offset: 0,
            length: 1,
            language: "go",
          } as MessageEntity,
        ],
      },
    );
  });

  it("17: requires a non-zero decimal emoji-id", () => {
    for (const id of ["0", "00", "-5", "12a", "", "1.5", " 5", "0x5"]) {
      expectLiteral(`<tg-emoji emoji-id="${id}">x</tg-emoji>`);
    }
    expectLiteral("<tg-emoji>x</tg-emoji>");
    expectParse('<tg-emoji emoji-id="007">x</tg-emoji>', {
      text: "x",
      entities: [
        { type: "custom_emoji", offset: 0, length: 1, custom_emoji_id: "007" },
      ],
    });
    expectParse("<tg-emoji emoji-id=5>x</tg-emoji>", {
      text: "x",
      entities: [
        { type: "custom_emoji", offset: 0, length: 1, custom_emoji_id: "5" },
      ],
    });
  });

  it("18: closes the nearest open element with the same name", () => {
    expectParse("<b><i>x</b>y</i>", {
      text: "xy",
      entities: [
        { type: "bold", offset: 0, length: 1 },
        { type: "italic", offset: 0, length: 2 },
      ],
    });
    expectParse("<b>a<b>b</b>c</b>", {
      text: "abc",
      entities: [
        { type: "bold", offset: 0, length: 3 },
        { type: "bold", offset: 1, length: 1 },
      ],
    });
    expectParse(
      "<strong>x</b>",
      { text: "x</b>", entities: [] },
      { text: "<strong>x</b>", entities: [] },
    );
    expectLiteral("x</i>");
  });

  it("19: keeps <a> without href as literal text", () => {
    expectLiteral("<a>x</a>");
    expectLiteral('<a title="t">x</a>');
    // A bare or empty href is treated like a missing one
    expectLiteral('<a href="">x</a>');
    expectLiteral("<a href=''>x</a>");
    expectLiteral("<a href>x</a>");
    expectLiteral("<a href >x</a>");
    // The first href wins, so a later non-empty one does not rescue the tag
    expectLiteral('<a href href="1">x</a>');
  });
});

describe("HTMLStreamParser snapshots", () => {
  it("ended: a closed element grows over a restored tag even when it covered no text", () => {
    // The bold is empty mid-stream, but the restored <i> lies inside it
    expectParse(
      "<b><i></b>",
      { text: "", entities: [] },
      { text: "<i>", entities: [{ type: "bold", offset: 0, length: 3 }] },
    );
    expectParse(
      "<b><i></b>x",
      { text: "x", entities: [] },
      { text: "<i>x", entities: [{ type: "bold", offset: 0, length: 3 }] },
    );
    // The restored <i> stands before the bold, which stays empty
    expectParse(
      "<i><b></b>",
      { text: "", entities: [] },
      { text: "<i>", entities: [] },
    );
  });

  it("ended: an empty element stays empty once nothing restored can be inside it", () => {
    // The <i> inside the bold closes before it can be restored
    expectParse("<b><i></b></i>", { text: "", entities: [] });
    expectParse("<b><i></b></i>x", { text: "x", entities: [] });
    // Tags opened after the empty element closed never land inside it
    expectParse(
      "<b></b><i>x",
      { text: "x", entities: [] },
      { text: "<i>x", entities: [] },
    );
  });

  it("an end tag closes the nearest open element with its name", () => {
    expectParse("<b><i>x</b>y</i>", {
      text: "xy",
      entities: [
        { type: "bold", offset: 0, length: 1 },
        { type: "italic", offset: 0, length: 2 },
      ],
    });
    expectParse(
      "<b><b>x</b>y",
      { text: "xy", entities: [{ type: "bold", offset: 0, length: 1 }] },
      { text: "<b>xy", entities: [{ type: "bold", offset: 3, length: 1 }] },
    );
  });

  it("ended: restores open tags of different names in source order", () => {
    expectParse(
      "<b>a<i>b<s>c<u>d</s><b>e",
      {
        text: "abcde",
        entities: [{ type: "strikethrough", offset: 2, length: 2 }],
      },
      {
        text: "<b>a<i>bc<u>d<b>e",
        entities: [{ type: "strikethrough", offset: 8, length: 5 }],
      },
    );
    // At one offset, source order decides across names too
    expectParse(
      "<b><s><i>x</s>",
      {
        text: "x",
        entities: [{ type: "strikethrough", offset: 0, length: 1 }],
      },
      {
        text: "<b><i>x",
        entities: [{ type: "strikethrough", offset: 3, length: 4 }],
      },
    );
  });

  it("ended: pre and code merge only when their ended ranges match", () => {
    // Mid-stream both cover "a"; once <b> is restored, pre also covers it
    expectParse(
      '<pre><b><code class="language-x">a</code></pre>',
      {
        text: "a",
        entities: [{ type: "pre", offset: 0, length: 1, language: "x" }],
      },
      {
        text: "<b>a",
        entities: [
          { type: "pre", offset: 0, length: 4 },
          { type: "code", offset: 3, length: 1 },
        ],
      },
    );
  });

  it("an empty element between pre and code does not block the language merge", () => {
    expectParse(
      '<pre><code class="language-x">a</code><b></b></pre>',
      {
        text: "a",
        entities: [{ type: "pre", offset: 0, length: 1, language: "x" }],
      },
    );
  });

  it("are idempotent and do not mutate the parser", () => {
    const parser = new HTMLStreamParser();
    parser.add("<i>a</i><b>b&am");

    const intermediate = parser.toFormattedString();
    const ended = parser.toFormattedString({ ended: true });
    // Mutating a result must not affect later snapshots
    intermediate.rawEntities[0].offset = 99;
    ended.rawEntities[0].length = 99;
    intermediate.rawEntities.push({ type: "bold", offset: 0, length: 1 });

    for (let i = 0; i < 2; i++) {
      assertEquals(snapshotsOf(parser), {
        intermediate: {
          text: "ab",
          entities: [{ type: "italic", offset: 0, length: 1 }],
        },
        ended: {
          text: "a<b>b&am",
          entities: [{ type: "italic", offset: 0, length: 1 }],
        },
      });
    }
  });

  it("allow add() to continue after an ended snapshot", () => {
    const parser = new HTMLStreamParser();
    parser.add("<b>x &am");
    assertEquals(parser.toFormattedString({ ended: true }).rawText, "<b>x &am");

    parser.add("p;</b>");
    assertEquals(snapshotsOf(parser), {
      intermediate: {
        text: "x &",
        entities: [{ type: "bold", offset: 0, length: 3 }],
      },
      ended: {
        text: "x &",
        entities: [{ type: "bold", offset: 0, length: 3 }],
      },
    });
  });
});

describe("HTMLStreamParser chunking", () => {
  it("releases text early when no supported tag can match", () => {
    const parser = new HTMLStreamParser();
    parser.add("1 < 2");
    assertEquals(parser.toFormattedString().rawText, "1 < 2");
    parser.add(" <bx <x");
    assertEquals(parser.toFormattedString().rawText, "1 < 2 <bx <x");
  });

  it("gives the same result for every chunking of malformed input", () => {
    const corpus = [
      "",
      "<",
      "<<",
      "</",
      "</</",
      "<b",
      "<b ",
      "<b x",
      "<b x=",
      '<b x="',
      "<b x='y",
      "<b x=y",
      "&",
      "&#",
      "&#x",
      "&#;",
      "&#x;",
      "&;",
      "& ",
      "a & b < c > d",
      "<<b>x</b>",
      "<b<b>x</b>",
      "<b>x</</b>",
      "<b>x</b<b>y</b>",
      '<b>😀</b><😀>&😀;<a href="😀">😀</a>',
      '<tg-time unix="1" format="wDT">t</tg-time><tg-time unix=x>',
      "<blockquote expandable\n>q</blockquote\t>",
      "<b>a<i>b</b>c<u>d</i>e",
      '<pre><code class="language-ts">&lt;T&gt;</code></pre>',
      "<a href='x' href=\"y\" href=z>l</a>",
      "<b>&#x1F600;</b>&#128512;&#xD800;&#55296;",
      "<tg-spoiler>s</tg-spoiler><span class=tg-spoiler>t",
      '<a href="&amp"><a href=&>',
      "<b>open<i>nested</i><u>more",
    ];
    for (const input of corpus) {
      parseEveryChunking(input);
    }
  });
});
