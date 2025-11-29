import { assertEquals, assertInstanceOf, describe, it } from "./deps.test.ts";
import { FormattedString } from "../src/format.ts";

describe("FormattedString - fromHtml", () => {
  describe("Static method", () => {
    it("should parse plain text without tags", () => {
      const result = FormattedString.fromHtml("Hello World");
      assertInstanceOf(result, FormattedString);
      assertEquals(result.rawText, "Hello World");
      assertEquals(result.rawEntities, []);
    });

    it("should parse empty string", () => {
      const result = FormattedString.fromHtml("");
      assertEquals(result.rawText, "");
      assertEquals(result.rawEntities, []);
    });

    describe("Bold formatting", () => {
      it("should parse <b> tag", () => {
        const result = FormattedString.fromHtml("<b>bold text</b>");
        assertEquals(result.rawText, "bold text");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "bold");
        assertEquals(result.rawEntities[0]?.offset, 0);
        assertEquals(result.rawEntities[0]?.length, 9);
      });

      it("should parse <strong> tag", () => {
        const result = FormattedString.fromHtml("<strong>bold text</strong>");
        assertEquals(result.rawText, "bold text");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "bold");
      });
    });

    describe("Italic formatting", () => {
      it("should parse <i> tag", () => {
        const result = FormattedString.fromHtml("<i>italic text</i>");
        assertEquals(result.rawText, "italic text");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "italic");
        assertEquals(result.rawEntities[0]?.offset, 0);
        assertEquals(result.rawEntities[0]?.length, 11);
      });

      it("should parse <em> tag", () => {
        const result = FormattedString.fromHtml("<em>italic text</em>");
        assertEquals(result.rawText, "italic text");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "italic");
      });
    });

    describe("Underline formatting", () => {
      it("should parse <u> tag", () => {
        const result = FormattedString.fromHtml("<u>underline text</u>");
        assertEquals(result.rawText, "underline text");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "underline");
      });

      it("should parse <ins> tag", () => {
        const result = FormattedString.fromHtml("<ins>underline text</ins>");
        assertEquals(result.rawText, "underline text");
        assertEquals(result.rawEntities[0]?.type, "underline");
      });
    });

    describe("Strikethrough formatting", () => {
      it("should parse <s> tag", () => {
        const result = FormattedString.fromHtml("<s>strikethrough</s>");
        assertEquals(result.rawText, "strikethrough");
        assertEquals(result.rawEntities[0]?.type, "strikethrough");
      });

      it("should parse <strike> tag", () => {
        const result = FormattedString.fromHtml(
          "<strike>strikethrough</strike>",
        );
        assertEquals(result.rawText, "strikethrough");
        assertEquals(result.rawEntities[0]?.type, "strikethrough");
      });

      it("should parse <del> tag", () => {
        const result = FormattedString.fromHtml("<del>strikethrough</del>");
        assertEquals(result.rawText, "strikethrough");
        assertEquals(result.rawEntities[0]?.type, "strikethrough");
      });
    });

    describe("Spoiler formatting", () => {
      it("should parse <tg-spoiler> tag", () => {
        const result = FormattedString.fromHtml(
          "<tg-spoiler>spoiler text</tg-spoiler>",
        );
        assertEquals(result.rawText, "spoiler text");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "spoiler");
      });

      it('should parse <span class="tg-spoiler"> tag', () => {
        const result = FormattedString.fromHtml(
          '<span class="tg-spoiler">spoiler text</span>',
        );
        assertEquals(result.rawText, "spoiler text");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "spoiler");
      });

      it("should ignore span without tg-spoiler class", () => {
        const result = FormattedString.fromHtml(
          '<span class="other">text</span>',
        );
        assertEquals(result.rawText, "text");
        assertEquals(result.rawEntities, []);
      });
    });

    describe("Code formatting", () => {
      it("should parse <code> tag", () => {
        const result = FormattedString.fromHtml("<code>inline code</code>");
        assertEquals(result.rawText, "inline code");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "code");
      });
    });

    describe("Pre formatting", () => {
      it("should parse <pre> tag without language", () => {
        const result = FormattedString.fromHtml("<pre>code block</pre>");
        assertEquals(result.rawText, "code block");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "pre");
      });

      it('should parse <pre><code class="language-xxx"> pattern', () => {
        const result = FormattedString.fromHtml(
          '<pre><code class="language-python">print("Hello")</code></pre>',
        );
        assertEquals(result.rawText, 'print("Hello")');
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "pre");
        assertEquals(
          (result.rawEntities[0] as { language?: string })?.language,
          "python",
        );
      });
    });

    describe("Link formatting", () => {
      it('should parse <a href="url"> tag', () => {
        const result = FormattedString.fromHtml(
          '<a href="https://example.com">link text</a>',
        );
        assertEquals(result.rawText, "link text");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "text_link");
        assertEquals(
          (result.rawEntities[0] as { url?: string })?.url,
          "https://example.com",
        );
      });

      it("should parse user mention link", () => {
        const result = FormattedString.fromHtml(
          '<a href="tg://user?id=123456">user name</a>',
        );
        assertEquals(result.rawText, "user name");
        assertEquals(result.rawEntities[0]?.type, "text_link");
        assertEquals(
          (result.rawEntities[0] as { url?: string })?.url,
          "tg://user?id=123456",
        );
      });
    });

    describe("Custom emoji formatting", () => {
      it('should parse <tg-emoji emoji-id="xxx"> tag', () => {
        const result = FormattedString.fromHtml(
          '<tg-emoji emoji-id="5368324170671202286">👍</tg-emoji>',
        );
        assertEquals(result.rawText, "👍");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "custom_emoji");
        assertEquals(
          (result.rawEntities[0] as { custom_emoji_id?: string })
            ?.custom_emoji_id,
          "5368324170671202286",
        );
      });
    });

    describe("Blockquote formatting", () => {
      it("should parse <blockquote> tag", () => {
        const result = FormattedString.fromHtml(
          "<blockquote>quoted text</blockquote>",
        );
        assertEquals(result.rawText, "quoted text");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "blockquote");
      });

      it("should parse <blockquote expandable> tag", () => {
        const result = FormattedString.fromHtml(
          "<blockquote expandable>expandable text</blockquote>",
        );
        assertEquals(result.rawText, "expandable text");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "expandable_blockquote");
      });
    });

    describe("Nested formatting", () => {
      it("should parse nested bold and italic", () => {
        const result = FormattedString.fromHtml("<b><i>bold italic</i></b>");
        assertEquals(result.rawText, "bold italic");
        assertEquals(result.rawEntities.length, 2);
        // Both entities should cover the same text
        const types = result.rawEntities.map((e) => e.type).sort();
        assertEquals(types, ["bold", "italic"]);
      });

      it("should parse adjacent formatting", () => {
        const result = FormattedString.fromHtml(
          "<b>bold</b> and <i>italic</i>",
        );
        assertEquals(result.rawText, "bold and italic");
        assertEquals(result.rawEntities.length, 2);
        assertEquals(result.rawEntities[0]?.type, "bold");
        assertEquals(result.rawEntities[0]?.offset, 0);
        assertEquals(result.rawEntities[0]?.length, 4);
        assertEquals(result.rawEntities[1]?.type, "italic");
        assertEquals(result.rawEntities[1]?.offset, 9);
        assertEquals(result.rawEntities[1]?.length, 6);
      });

      it("should handle deeply nested tags", () => {
        const result = FormattedString.fromHtml(
          "<b><i><u>nested</u></i></b>",
        );
        assertEquals(result.rawText, "nested");
        assertEquals(result.rawEntities.length, 3);
      });
    });

    describe("HTML entities", () => {
      it("should decode &lt; &gt; &amp;", () => {
        const result = FormattedString.fromHtml("&lt;tag&gt; &amp; more");
        assertEquals(result.rawText, "<tag> & more");
      });

      it("should decode numeric entities", () => {
        const result = FormattedString.fromHtml("&#65;&#66;&#67;");
        assertEquals(result.rawText, "ABC");
      });

      it("should decode hex numeric entities", () => {
        const result = FormattedString.fromHtml("&#x41;&#x42;&#x43;");
        assertEquals(result.rawText, "ABC");
      });

      it("should decode named entities", () => {
        const result = FormattedString.fromHtml(
          "&quot;hello&quot; &apos;world&apos;",
        );
        assertEquals(result.rawText, "\"hello\" 'world'");
      });

      it("should preserve unknown entities as-is", () => {
        const result = FormattedString.fromHtml("&unknown;");
        assertEquals(result.rawText, "&unknown;");
      });

      it("should handle malformed entities", () => {
        const result = FormattedString.fromHtml("&lt no semicolon");
        assertEquals(result.rawText, "&lt no semicolon");
      });
    });

    describe("Edge cases", () => {
      it("should handle empty tags", () => {
        const result = FormattedString.fromHtml("<b></b>");
        assertEquals(result.rawText, "");
        assertEquals(result.rawEntities, []);
      });

      it("should handle unclosed tags", () => {
        const result = FormattedString.fromHtml("<b>unclosed");
        assertEquals(result.rawText, "unclosed");
        assertEquals(result.rawEntities, []);
      });

      it("should handle unmatched closing tags", () => {
        const result = FormattedString.fromHtml("text</b>");
        assertEquals(result.rawText, "text");
        assertEquals(result.rawEntities, []);
      });

      it("should handle mixed case tags", () => {
        const result = FormattedString.fromHtml("<B>bold</B>");
        assertEquals(result.rawText, "bold");
        assertEquals(result.rawEntities.length, 1);
        assertEquals(result.rawEntities[0]?.type, "bold");
      });

      it("should ignore unsupported tags", () => {
        const result = FormattedString.fromHtml("<div>text</div>");
        assertEquals(result.rawText, "text");
        assertEquals(result.rawEntities, []);
      });

      it("should handle attributes with single quotes", () => {
        const result = FormattedString.fromHtml(
          "<a href='https://example.com'>link</a>",
        );
        assertEquals(result.rawText, "link");
        assertEquals(
          (result.rawEntities[0] as { url?: string })?.url,
          "https://example.com",
        );
      });

      it("should handle whitespace in tags", () => {
        const result = FormattedString.fromHtml("<b  >text</b >");
        assertEquals(result.rawText, "text");
        assertEquals(result.rawEntities.length, 1);
      });

      it("should handle complex document", () => {
        const html =
          '<b>Hello</b> <i>world</i>! Check <a href="https://t.me">Telegram</a> &amp; more.';
        const result = FormattedString.fromHtml(html);
        assertEquals(result.rawText, "Hello world! Check Telegram & more.");
        assertEquals(result.rawEntities.length, 3);
      });
    });
  });

  describe("Instance method", () => {
    it("should append parsed HTML to existing FormattedString", () => {
      const prefix = new FormattedString("Prefix: ");
      const result = prefix.fromHtml("<b>bold</b>");
      assertInstanceOf(result, FormattedString);
      assertEquals(result.rawText, "Prefix: bold");
      assertEquals(result.rawEntities.length, 1);
      assertEquals(result.rawEntities[0]?.type, "bold");
      assertEquals(result.rawEntities[0]?.offset, 8);
      assertEquals(result.rawEntities[0]?.length, 4);
    });

    it("should preserve existing entities", () => {
      const initial = FormattedString.bold("existing");
      const result = initial.fromHtml(" <i>new</i>");
      assertEquals(result.rawText, "existing new");
      assertEquals(result.rawEntities.length, 2);
      assertEquals(result.rawEntities[0]?.type, "bold");
      assertEquals(result.rawEntities[1]?.type, "italic");
    });

    it("should work with empty prefix", () => {
      const empty = new FormattedString("");
      const result = empty.fromHtml("<b>text</b>");
      assertEquals(result.rawText, "text");
      assertEquals(result.rawEntities.length, 1);
    });
  });
});
