import { assertEquals } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";
import {
  FormattedString,
  parseHTML,
  parseHTMLToFormattedStringData,
  validateHTML,
  HTMLParseWarningType,
  type HTMLParseResult
} from "../src/mod.ts";

Deno.test("HTML Parser - Basic bold tag", () => {
  const result = parseHTML("<b>bold text</b>");
  
  assertEquals(result.rawText, "bold text");
  assertEquals(result.rawEntities.length, 1);
  assertEquals(result.rawEntities[0], {
    type: "bold",
    offset: 0,
    length: 9
  });
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Basic strong tag", () => {
  const result = parseHTML("<strong>strong text</strong>");
  
  assertEquals(result.rawText, "strong text");
  assertEquals(result.rawEntities.length, 1);
  assertEquals(result.rawEntities[0], {
    type: "bold",
    offset: 0,
    length: 11
  });
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Basic italic tag", () => {
  const result = parseHTML("<i>italic text</i>");
  
  assertEquals(result.rawText, "italic text");
  assertEquals(result.rawEntities.length, 1);
  assertEquals(result.rawEntities[0], {
    type: "italic",
    offset: 0,
    length: 11
  });
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Basic em tag", () => {
  const result = parseHTML("<em>emphasized text</em>");
  
  assertEquals(result.rawText, "emphasized text");
  assertEquals(result.rawEntities.length, 1);
  assertEquals(result.rawEntities[0], {
    type: "italic",
    offset: 0,
    length: 15
  });
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Basic underline tag", () => {
  const result = parseHTML("<u>underlined text</u>");
  
  assertEquals(result.rawText, "underlined text");
  assertEquals(result.rawEntities.length, 1);
  assertEquals(result.rawEntities[0], {
    type: "underline",
    offset: 0,
    length: 15
  });
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Basic strikethrough tag", () => {
  const result = parseHTML("<s>strikethrough text</s>");
  
  assertEquals(result.rawText, "strikethrough text");
  assertEquals(result.rawEntities.length, 1);
  assertEquals(result.rawEntities[0], {
    type: "strikethrough",
    offset: 0,
    length: 18
  });
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Basic del tag", () => {
  const result = parseHTML("<del>deleted text</del>");
  
  assertEquals(result.rawText, "deleted text");
  assertEquals(result.rawEntities.length, 1);
  assertEquals(result.rawEntities[0], {
    type: "strikethrough",
    offset: 0,
    length: 12
  });
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Nested tags", () => {
  const result = parseHTML("<b>bold <i>and italic</i> text</b>");
  
  assertEquals(result.rawText, "bold and italic text");
  assertEquals(result.rawEntities.length, 2);
  
  // Bold entity covering entire text
  const boldEntity = result.rawEntities.find(e => e.type === "bold");
  assertEquals(boldEntity, {
    type: "bold",
    offset: 0,
    length: 20
  });
  
  // Italic entity covering middle part
  const italicEntity = result.rawEntities.find(e => e.type === "italic");
  assertEquals(italicEntity, {
    type: "italic",
    offset: 5,
    length: 10
  });
  
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Overlapping tags", () => {
  const result = parseHTML("<b>bold <i>overlap</b> italic</i>");
  
  assertEquals(result.rawText, "bold overlap italic");
  assertEquals(result.rawEntities.length, 2);
  
  // Bold entity covering "bold overlap"
  const boldEntity = result.rawEntities.find(e => e.type === "bold");
  assertEquals(boldEntity, {
    type: "bold",
    offset: 0,
    length: 12
  });
  
  // Italic entity covering "overlap italic" (consolidated from two adjacent italic entities)
  const italicEntity = result.rawEntities.find(e => e.type === "italic");
  assertEquals(italicEntity, {
    type: "italic",
    offset: 5,
    length: 14
  });
  
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Unclosed tag", () => {
  const result = parseHTML("<b>unclosed tag");
  
  assertEquals(result.rawText, "unclosed tag");
  assertEquals(result.rawEntities.length, 1);
  assertEquals(result.rawEntities[0], {
    type: "bold",
    offset: 0,
    length: 12
  });
  
  // Should have warning about unclosed tag
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].type, HTMLParseWarningType.UNCLOSED_TAG);
});

Deno.test("HTML Parser - Orphaned closing tag", () => {
  const result = parseHTML("text with </b> orphaned tag");
  
  assertEquals(result.rawText, "text with </b> orphaned tag");
  assertEquals(result.rawEntities.length, 0);
  
  // Should have warning about orphaned closing tag
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].type, HTMLParseWarningType.ORPHANED_CLOSING_TAG);
});

Deno.test("HTML Parser - Unsupported tag", () => {
  const result = parseHTML("<div>unsupported tag</div>");
  
  assertEquals(result.rawText, "<div>unsupported tag</div>");
  assertEquals(result.rawEntities.length, 0);
  
  // Should have warnings about unsupported tags
  assertEquals(result.warnings.length, 2);
  assertEquals(result.warnings[0].type, HTMLParseWarningType.UNSUPPORTED_TAG);
  assertEquals(result.warnings[1].type, HTMLParseWarningType.UNSUPPORTED_TAG);
});

Deno.test("HTML Parser - Malformed tag", () => {
  const result = parseHTML("<b invalid>text</b>");
  
  assertEquals(result.rawText, "<b invalid>text</b>");
  assertEquals(result.rawEntities.length, 0);
  
  // Should have warning about malformed tag
  assertEquals(result.warnings.length, 2);
  assertEquals(result.warnings[0].type, HTMLParseWarningType.MALFORMED_TAG);
});

Deno.test("HTML Parser - Empty HTML", () => {
  const result = parseHTML("");
  
  assertEquals(result.rawText, "");
  assertEquals(result.rawEntities.length, 0);
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Plain text", () => {
  const result = parseHTML("just plain text");
  
  assertEquals(result.rawText, "just plain text");
  assertEquals(result.rawEntities.length, 0);
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Mixed content", () => {
  const result = parseHTML("Start <b>bold</b> middle <i>italic</i> end");
  
  assertEquals(result.rawText, "Start bold middle italic end");
  assertEquals(result.rawEntities.length, 2);
  
  const boldEntity = result.rawEntities.find(e => e.type === "bold");
  assertEquals(boldEntity, {
    type: "bold",
    offset: 6,
    length: 4
  });
  
  const italicEntity = result.rawEntities.find(e => e.type === "italic");
  assertEquals(italicEntity, {
    type: "italic",
    offset: 18,
    length: 6
  });
  
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Case insensitive tags", () => {
  const result = parseHTML("<B>BOLD</B> <I>ITALIC</I>");
  
  assertEquals(result.rawText, "BOLD ITALIC");
  assertEquals(result.rawEntities.length, 2);
  
  const boldEntity = result.rawEntities.find(e => e.type === "bold");
  assertEquals(boldEntity, {
    type: "bold",
    offset: 0,
    length: 4
  });
  
  const italicEntity = result.rawEntities.find(e => e.type === "italic");
  assertEquals(italicEntity, {
    type: "italic",
    offset: 5,
    length: 6
  });
  
  assertEquals(result.warnings.length, 0);
});

Deno.test("HTML Parser - Complex nesting", () => {
  const result = parseHTML("<b><i><u>all three</u></i></b>");
  
  assertEquals(result.rawText, "all three");
  assertEquals(result.rawEntities.length, 3);
  
  // All entities should cover the same text
  result.rawEntities.forEach(entity => {
    assertEquals(entity.offset, 0);
    assertEquals(entity.length, 9);
  });
  
  // Should have all three entity types
  const types = result.rawEntities.map(e => e.type).sort();
  assertEquals(types, ["bold", "italic", "underline"]);
  
  assertEquals(result.warnings.length, 0);
});

Deno.test("FormattedString.fromHTML - Basic usage", () => {
  const formatted = FormattedString.fromHTML("<b>Hello</b> <i>World</i>");
  
  assertEquals(formatted.rawText, "Hello World");
  assertEquals(formatted.rawEntities.length, 2);
  
  const boldEntity = formatted.rawEntities.find(e => e.type === "bold");
  assertEquals(boldEntity, {
    type: "bold",
    offset: 0,
    length: 5
  });
  
  const italicEntity = formatted.rawEntities.find(e => e.type === "italic");
  assertEquals(italicEntity, {
    type: "italic",
    offset: 6,
    length: 5
  });
});

Deno.test("FormattedString.fromHTMLWithWarnings - With warnings", () => {
  const result = FormattedString.fromHTMLWithWarnings("<b>unclosed");
  
  assertEquals(result.formattedString.rawText, "unclosed");
  assertEquals(result.formattedString.rawEntities.length, 1);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].type, HTMLParseWarningType.UNCLOSED_TAG);
});

Deno.test("FormattedString.concatHTML - Multiple HTML strings", () => {
  const result = FormattedString.concatHTML([
    "<b>First</b>",
    "<i>Second</i>",
    "<u>Third</u>"
  ]);
  
  assertEquals(result.rawText, "FirstSecondThird");
  assertEquals(result.rawEntities.length, 3);
  
  // Check entity positions
  const boldEntity = result.rawEntities.find(e => e.type === "bold");
  assertEquals(boldEntity?.offset, 0);
  assertEquals(boldEntity?.length, 5);
  
  const italicEntity = result.rawEntities.find(e => e.type === "italic");
  assertEquals(italicEntity?.offset, 5);
  assertEquals(italicEntity?.length, 6);
  
  const underlineEntity = result.rawEntities.find(e => e.type === "underline");
  assertEquals(underlineEntity?.offset, 11);
  assertEquals(underlineEntity?.length, 5);
});

Deno.test("FormattedString.concatHTML - With separator", () => {
  const result = FormattedString.concatHTML([
    "<b>First</b>",
    "<i>Second</i>"
  ], " - ");
  
  assertEquals(result.rawText, "First - Second");
  assertEquals(result.rawEntities.length, 2);
  
  const boldEntity = result.rawEntities.find(e => e.type === "bold");
  assertEquals(boldEntity?.offset, 0);
  assertEquals(boldEntity?.length, 5);
  
  const italicEntity = result.rawEntities.find(e => e.type === "italic");
  assertEquals(italicEntity?.offset, 8);
  assertEquals(italicEntity?.length, 6);
});

Deno.test("FormattedString instance html() method", () => {
  const base = new FormattedString("Start ");
  const result = base.html("<b>Bold</b> text");
  
  assertEquals(result.rawText, "Start Bold text");
  assertEquals(result.rawEntities.length, 1);
  assertEquals(result.rawEntities[0], {
    type: "bold",
    offset: 6,
    length: 4
  });
});

Deno.test("parseHTMLToFormattedStringData - Utility function", () => {
  const result = parseHTMLToFormattedStringData("<b>test</b>");
  
  assertEquals(result.rawText, "test");
  assertEquals(result.rawEntities.length, 1);
  assertEquals(result.rawEntities[0], {
    type: "bold",
    offset: 0,
    length: 4
  });
  
  // Should not include warnings
  assertEquals(Object.hasOwnProperty.call(result, 'warnings'), false);
});

Deno.test("validateHTML - Valid HTML", () => {
  const result = validateHTML("<b>valid</b>");
  
  assertEquals(result.isValid, true);
  assertEquals(result.warnings.length, 0);
});

Deno.test("validateHTML - Invalid HTML", () => {
  const result = validateHTML("<b invalid>malformed</b>");
  
  assertEquals(result.isValid, false);
  assertEquals(result.warnings.length, 2);
  assertEquals(result.warnings[0].type, HTMLParseWarningType.MALFORMED_TAG);
});

Deno.test("HTML Parser - Incomplete tag at end", () => {
  const result = parseHTML("text <b");
  
  assertEquals(result.rawText, "text <b");
  assertEquals(result.rawEntities.length, 0);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].type, HTMLParseWarningType.MALFORMED_TAG);
});

Deno.test("HTML Parser - Tag equivalence (b/strong, i/em, s/del)", () => {
  const result = parseHTML("<b>bold <strong>strong</b> text</strong>");
  
  assertEquals(result.rawText, "bold strong text");
  
  // Since b and strong both map to "bold", overlapping entities get consolidated
  const boldEntities = result.rawEntities.filter(e => e.type === "bold");
  assertEquals(boldEntities.length, 1); // All bold entities consolidated into one
  
  // Should cover the entire text
  assertEquals(boldEntities[0], {
    type: "bold",
    offset: 0,
    length: 16
  });
  
  assertEquals(result.warnings.length, 0);
});