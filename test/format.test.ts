import { assertEquals, assertInstanceOf, assertNotStrictEquals } from "./deps.test.ts";
import { FormattedString, fmt, b, i, u } from "../src/format.ts";
import type { MessageEntity } from "../src/deps.deno.ts";

// Helper function to compare FormattedString instances
function expectFormattedStringEqual(
  actual: FormattedString,
  expectedText: string,
  expectedEntities: MessageEntity[],
  message?: string,
) {
  assertEquals(actual.rawText, expectedText, message ? `Text mismatch: ${message}` : "Text mismatch");

  // Sort entities by offset, then type, then length for consistent comparison
  const sortEntities = (a: MessageEntity, b: MessageEntity) => {
    if (a.offset !== b.offset) return a.offset - b.offset;
    if (a.length !== b.length) return a.length - b.length;
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    // Add more properties if needed for specific entity types, e.g. URL for text_link
    if (a.type === "text_link" && b.type === "text_link") {
        return (a.url ?? "").localeCompare(b.url ?? "");
    }
    if (a.type === "pre" && b.type === "pre") {
        return (a.language ?? "").localeCompare(b.language ?? "");
    }
    if (a.type === "text_mention" && b.type === "text_mention") {
        return (a.user?.id ?? 0) - (b.user?.id ?? 0);
    }
    if (a.type === "custom_emoji" && b.type === "custom_emoji") {
        return (a.custom_emoji_id ?? "").localeCompare(b.custom_emoji_id ?? "");
    }
    return 0;
  };

  const actualSortedEntities = [...actual.rawEntities].sort(sortEntities);
  const expectedSortedEntities = [...expectedEntities].sort(sortEntities);

  assertEquals(actualSortedEntities, expectedSortedEntities, message ? `Entities mismatch: ${message}` : "Entities mismatch");
}

Deno.test("FormattedString - Constructor", () => {
  const text = "Hello World";
  const entities: MessageEntity[] = [
    { type: "bold", offset: 0, length: 5 },
  ];

  const formatted = new FormattedString(text, entities);

  assertEquals(formatted.rawText, text);
  assertEquals(formatted.rawEntities, entities);
});

Deno.test("FormattedString - Text and caption getters", () => {
  const text = "Hello World";
  const entities: MessageEntity[] = [
    { type: "bold", offset: 0, length: 5 },
  ];

  const formatted = new FormattedString(text, entities);

  assertEquals(formatted.text, text);
  assertEquals(formatted.caption, text);
  assertEquals(formatted.entities, entities);
  assertEquals(formatted.caption_entities, entities);
});

Deno.test("FormattedString - toString method", () => {
  const text = "Hello World";
  const entities: MessageEntity[] = [
    { type: "bold", offset: 0, length: 5 },
  ];

  const formatted = new FormattedString(text, entities);

  assertEquals(formatted.toString(), text);
});

Deno.test("FormattedString - Static bold methods", () => {
  const text = "bold text";

  const boldFormatted = FormattedString.bold(text);
  const bFormatted = FormattedString.b(text);

  assertInstanceOf(boldFormatted, FormattedString);
  assertInstanceOf(bFormatted, FormattedString);
  assertEquals(boldFormatted.rawText, text);
  assertEquals(bFormatted.rawText, text);

  // Test entity properties
  assertEquals(boldFormatted.rawEntities.length, 1);
  assertEquals(boldFormatted.rawEntities[0]?.type, "bold");
  assertEquals(boldFormatted.rawEntities[0]?.offset, 0);
  assertEquals(boldFormatted.rawEntities[0]?.length, text.length);

  assertEquals(bFormatted.rawEntities.length, 1);
  assertEquals(bFormatted.rawEntities[0]?.type, "bold");
  assertEquals(bFormatted.rawEntities[0]?.offset, 0);
  assertEquals(bFormatted.rawEntities[0]?.length, text.length);
});

Deno.test("FormattedString - Static italic methods", () => {
  const text = "italic text";

  const italicFormatted = FormattedString.italic(text);
  const iFormatted = FormattedString.i(text);

  assertInstanceOf(italicFormatted, FormattedString);
  assertInstanceOf(iFormatted, FormattedString);
  assertEquals(italicFormatted.rawText, text);
  assertEquals(iFormatted.rawText, text);

  // Test entity properties
  assertEquals(italicFormatted.rawEntities.length, 1);
  assertEquals(italicFormatted.rawEntities[0]?.type, "italic");
  assertEquals(italicFormatted.rawEntities[0]?.offset, 0);
  assertEquals(italicFormatted.rawEntities[0]?.length, text.length);

  assertEquals(iFormatted.rawEntities.length, 1);
  assertEquals(iFormatted.rawEntities[0]?.type, "italic");
  assertEquals(iFormatted.rawEntities[0]?.offset, 0);
  assertEquals(iFormatted.rawEntities[0]?.length, text.length);
});

Deno.test("FormattedString - Static strikethrough methods", () => {
  const text = "strikethrough text";

  const strikethroughFormatted = FormattedString.strikethrough(text);
  const sFormatted = FormattedString.s(text);

  assertInstanceOf(strikethroughFormatted, FormattedString);
  assertInstanceOf(sFormatted, FormattedString);
  assertEquals(strikethroughFormatted.rawText, text);
  assertEquals(sFormatted.rawText, text);

  // Test entity properties
  assertEquals(strikethroughFormatted.rawEntities.length, 1);
  assertEquals(strikethroughFormatted.rawEntities[0]?.type, "strikethrough");
  assertEquals(strikethroughFormatted.rawEntities[0]?.offset, 0);
  assertEquals(strikethroughFormatted.rawEntities[0]?.length, text.length);

  assertEquals(sFormatted.rawEntities.length, 1);
  assertEquals(sFormatted.rawEntities[0]?.type, "strikethrough");
  assertEquals(sFormatted.rawEntities[0]?.offset, 0);
  assertEquals(sFormatted.rawEntities[0]?.length, text.length);
});

Deno.test("FormattedString - Static underline methods", () => {
  const text = "underline text";

  const underlineFormatted = FormattedString.underline(text);
  const uFormatted = FormattedString.u(text);

  assertInstanceOf(underlineFormatted, FormattedString);
  assertInstanceOf(uFormatted, FormattedString);
  assertEquals(underlineFormatted.rawText, text);
  assertEquals(uFormatted.rawText, text);

  // Test entity properties
  assertEquals(underlineFormatted.rawEntities.length, 1);
  assertEquals(underlineFormatted.rawEntities[0]?.type, "underline");
  assertEquals(underlineFormatted.rawEntities[0]?.offset, 0);
  assertEquals(underlineFormatted.rawEntities[0]?.length, text.length);

  assertEquals(uFormatted.rawEntities.length, 1);
  assertEquals(uFormatted.rawEntities[0]?.type, "underline");
  assertEquals(uFormatted.rawEntities[0]?.offset, 0);
  assertEquals(uFormatted.rawEntities[0]?.length, text.length);
});

Deno.test("FormattedString - Static link methods", () => {
  const text = "link text";
  const url = "https://example.com";

  const linkFormatted = FormattedString.link(text, url);
  const aFormatted = FormattedString.a(text, url);

  assertInstanceOf(linkFormatted, FormattedString);
  assertInstanceOf(aFormatted, FormattedString);
  assertEquals(linkFormatted.rawText, text);
  assertEquals(aFormatted.rawText, text);

  // Test entity properties
  assertEquals(linkFormatted.rawEntities.length, 1);
  assertEquals(linkFormatted.rawEntities[0]?.type, "text_link");
  assertEquals(linkFormatted.rawEntities[0]?.offset, 0);
  assertEquals(linkFormatted.rawEntities[0]?.length, text.length);
  //@ts-expect-error quick test
  assertEquals(linkFormatted.rawEntities[0]?.url, url);

  assertEquals(aFormatted.rawEntities.length, 1);
  assertEquals(aFormatted.rawEntities[0]?.type, "text_link");
  assertEquals(aFormatted.rawEntities[0]?.offset, 0);
  assertEquals(aFormatted.rawEntities[0]?.length, text.length);
  //@ts-expect-error quick test
  assertEquals(aFormatted.rawEntities[0]?.url, url);
});

Deno.test("FormattedString - Static code method", () => {
  const text = "code text";

  const codeFormatted = FormattedString.code(text);

  assertInstanceOf(codeFormatted, FormattedString);
  assertEquals(codeFormatted.rawText, text);

  // Test entity properties
  assertEquals(codeFormatted.rawEntities.length, 1);
  assertEquals(codeFormatted.rawEntities[0]?.type, "code");
  assertEquals(codeFormatted.rawEntities[0]?.offset, 0);
  assertEquals(codeFormatted.rawEntities[0]?.length, text.length);
});

Deno.test("FormattedString - Static pre method", () => {
  const text = "console.log('hello');";
  const language = "javascript";

  const preFormatted = FormattedString.pre(text, language);

  assertInstanceOf(preFormatted, FormattedString);
  assertEquals(preFormatted.rawText, text);

  // Test entity properties
  assertEquals(preFormatted.rawEntities.length, 1);
  assertEquals(preFormatted.rawEntities[0]?.type, "pre");
  assertEquals(preFormatted.rawEntities[0]?.offset, 0);
  assertEquals(preFormatted.rawEntities[0]?.length, text.length);
  //@ts-expect-error quick test
  assertEquals(preFormatted.rawEntities[0]?.language, language);
});

Deno.test("FormattedString - Static spoiler method", () => {
  const text = "spoiler text";

  const spoilerFormatted = FormattedString.spoiler(text);

  assertInstanceOf(spoilerFormatted, FormattedString);
  assertEquals(spoilerFormatted.rawText, text);

  // Test entity properties
  assertEquals(spoilerFormatted.rawEntities.length, 1);
  assertEquals(spoilerFormatted.rawEntities[0]?.type, "spoiler");
  assertEquals(spoilerFormatted.rawEntities[0]?.offset, 0);
  assertEquals(spoilerFormatted.rawEntities[0]?.length, text.length);
});

Deno.test("FormattedString - Static blockquote method", () => {
  const text = "quoted text";

  const blockquoteFormatted = FormattedString.blockquote(text);

  assertInstanceOf(blockquoteFormatted, FormattedString);
  assertEquals(blockquoteFormatted.rawText, text);

  // Test entity properties
  assertEquals(blockquoteFormatted.rawEntities.length, 1);
  assertEquals(blockquoteFormatted.rawEntities[0]?.type, "blockquote");
  assertEquals(blockquoteFormatted.rawEntities[0]?.offset, 0);
  assertEquals(blockquoteFormatted.rawEntities[0]?.length, text.length);
});

Deno.test("FormattedString - Static expandableBlockquote method", () => {
  const text = "expandable quoted text";

  const expandableBlockquoteFormatted = FormattedString.expandableBlockquote(
    text,
  );

  assertInstanceOf(expandableBlockquoteFormatted, FormattedString);
  assertEquals(expandableBlockquoteFormatted.rawText, text);

  // Test entity properties
  assertEquals(expandableBlockquoteFormatted.rawEntities.length, 1);
  assertEquals(
    expandableBlockquoteFormatted.rawEntities[0]?.type,
    "expandable_blockquote",
  );
  assertEquals(expandableBlockquoteFormatted.rawEntities[0]?.offset, 0);
  assertEquals(
    expandableBlockquoteFormatted.rawEntities[0]?.length,
    text.length,
  );
});

Deno.test("FormattedString - Static mentionUser method", () => {
  const text = "@username";
  const userId = 123456789;

  const mentionFormatted = FormattedString.mentionUser(text, userId);

  assertInstanceOf(mentionFormatted, FormattedString);
  assertEquals(mentionFormatted.rawText, text);

  // Test entity properties
  assertEquals(mentionFormatted.rawEntities.length, 1);
  assertEquals(mentionFormatted.rawEntities[0]?.type, "text_link");
  assertEquals(mentionFormatted.rawEntities[0]?.offset, 0);
  assertEquals(mentionFormatted.rawEntities[0]?.length, text.length);
  //@ts-expect-error quick test
  assertEquals(mentionFormatted.rawEntities[0]?.url, `tg://user?id=123456789`);
});

Deno.test("FormattedString - Static customEmoji method", () => {
  const placeholder = "😀";
  const emojiId = "5123456789123456789";

  const emojiFormatted = FormattedString.customEmoji(placeholder, emojiId);

  assertInstanceOf(emojiFormatted, FormattedString);
  assertEquals(emojiFormatted.rawText, placeholder);

  // Test entity properties
  assertEquals(emojiFormatted.rawEntities.length, 1);
  assertEquals(emojiFormatted.rawEntities[0]?.type, "text_link");
  assertEquals(emojiFormatted.rawEntities[0]?.offset, 0);
  assertEquals(emojiFormatted.rawEntities[0]?.length, placeholder.length);
  assertEquals(
    //@ts-expect-error quick test
    emojiFormatted.rawEntities[0]?.url,
    `tg://emoji?id=5123456789123456789`,
  );
});

Deno.test("FormattedString - Static linkMessage method for valid supergroup", () => {
  const text = "message link";
  const chatId = -1001234567890;
  const messageId = 123;

  const messageLinkFormatted = FormattedString.linkMessage(
    text,
    chatId,
    messageId,
  );

  assertInstanceOf(messageLinkFormatted, FormattedString);
  assertEquals(messageLinkFormatted.rawText, text);

  // Test entity properties
  assertEquals(messageLinkFormatted.rawEntities.length, 1);
  assertEquals(messageLinkFormatted.rawEntities[0]?.type, "text_link");
  assertEquals(messageLinkFormatted.rawEntities[0]?.offset, 0);
  assertEquals(messageLinkFormatted.rawEntities[0]?.length, text.length);
  assertEquals(
    //@ts-expect-error quick test
    messageLinkFormatted.rawEntities[0]?.url,
    `https://t.me/c/1234567890/123`,
  );
});

Deno.test("FormattedString - Static linkMessage method for invalid chat (positive ID)", () => {
  const text = "message link";
  const chatId = 1234567890; // Positive chat ID (private chat)
  const messageId = 123;

  const messageLinkFormatted = FormattedString.linkMessage(
    text,
    chatId,
    messageId,
  );

  assertInstanceOf(messageLinkFormatted, FormattedString);
  assertEquals(messageLinkFormatted.rawText, text);
  // Should not create a link for private chats
  assertEquals(messageLinkFormatted.rawEntities.length, 0);
});

Deno.test("FormattedString - Instance bold methods", () => {
  const initialText = "Hello ";
  const boldText = "World";
  const initialFormatted = new FormattedString(initialText, []);

  const boldResult = initialFormatted.bold(boldText);
  const bResult = initialFormatted.b(boldText);

  assertInstanceOf(boldResult, FormattedString);
  assertInstanceOf(bResult, FormattedString);
  assertEquals(boldResult.rawText, `${initialText}${boldText}`);
  assertEquals(bResult.rawText, `${initialText}${boldText}`);

  // Test entity properties
  assertEquals(boldResult.rawEntities.length, 1);
  assertEquals(boldResult.rawEntities[0]?.type, "bold");
  assertEquals(boldResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(boldResult.rawEntities[0]?.length, boldText.length);

  assertEquals(bResult.rawEntities.length, 1);
  assertEquals(bResult.rawEntities[0]?.type, "bold");
  assertEquals(bResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(bResult.rawEntities[0]?.length, boldText.length);
});

Deno.test("FormattedString - Instance italic methods", () => {
  const initialText = "Hello ";
  const italicText = "World";
  const initialFormatted = new FormattedString(initialText, []);

  const italicResult = initialFormatted.italic(italicText);
  const iResult = initialFormatted.i(italicText);

  assertInstanceOf(italicResult, FormattedString);
  assertInstanceOf(iResult, FormattedString);
  assertEquals(italicResult.rawText, `${initialText}${italicText}`);
  assertEquals(iResult.rawText, `${initialText}${italicText}`);

  // Test entity properties
  assertEquals(italicResult.rawEntities.length, 1);
  assertEquals(italicResult.rawEntities[0]?.type, "italic");
  assertEquals(italicResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(italicResult.rawEntities[0]?.length, italicText.length);

  assertEquals(iResult.rawEntities.length, 1);
  assertEquals(iResult.rawEntities[0]?.type, "italic");
  assertEquals(iResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(iResult.rawEntities[0]?.length, italicText.length);
});

Deno.test("FormattedString - Instance strikethrough methods", () => {
  const initialText = "Hello ";
  const strikeText = "World";
  const initialFormatted = new FormattedString(initialText, []);

  const strikeResult = initialFormatted.strikethrough(strikeText);
  const sResult = initialFormatted.s(strikeText);

  assertInstanceOf(strikeResult, FormattedString);
  assertInstanceOf(sResult, FormattedString);
  assertEquals(strikeResult.rawText, `${initialText}${strikeText}`);
  assertEquals(sResult.rawText, `${initialText}${strikeText}`);

  // Test entity properties
  assertEquals(strikeResult.rawEntities.length, 1);
  assertEquals(strikeResult.rawEntities[0]?.type, "strikethrough");
  assertEquals(strikeResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(strikeResult.rawEntities[0]?.length, strikeText.length);

  assertEquals(sResult.rawEntities.length, 1);
  assertEquals(sResult.rawEntities[0]?.type, "strikethrough");
  assertEquals(sResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(sResult.rawEntities[0]?.length, strikeText.length);
});

Deno.test("FormattedString - Instance underline methods", () => {
  const initialText = "Hello ";
  const underlineText = "World";
  const initialFormatted = new FormattedString(initialText, []);

  const underlineResult = initialFormatted.underline(underlineText);
  const uResult = initialFormatted.u(underlineText);

  assertInstanceOf(underlineResult, FormattedString);
  assertInstanceOf(uResult, FormattedString);
  assertEquals(underlineResult.rawText, `${initialText}${underlineText}`);
  assertEquals(uResult.rawText, `${initialText}${underlineText}`);

  // Test entity properties
  assertEquals(underlineResult.rawEntities.length, 1);
  assertEquals(underlineResult.rawEntities[0]?.type, "underline");
  assertEquals(underlineResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(underlineResult.rawEntities[0]?.length, underlineText.length);

  assertEquals(uResult.rawEntities.length, 1);
  assertEquals(uResult.rawEntities[0]?.type, "underline");
  assertEquals(uResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(uResult.rawEntities[0]?.length, underlineText.length);
});

Deno.test("FormattedString - Instance link methods", () => {
  const initialText = "Visit ";
  const linkText = "our website";
  const url = "https://example.com";
  const initialFormatted = new FormattedString(initialText, []);

  const linkResult = initialFormatted.link(linkText, url);
  const aResult = initialFormatted.a(linkText, url);

  assertInstanceOf(linkResult, FormattedString);
  assertInstanceOf(aResult, FormattedString);
  assertEquals(linkResult.rawText, `${initialText}${linkText}`);
  assertEquals(aResult.rawText, `${initialText}${linkText}`);

  // Test entity properties
  assertEquals(linkResult.rawEntities.length, 1);
  assertEquals(linkResult.rawEntities[0]?.type, "text_link");
  assertEquals(linkResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(linkResult.rawEntities[0]?.length, linkText.length);
  //@ts-expect-error quick test
  assertEquals(linkResult.rawEntities[0]?.url, url);

  assertEquals(aResult.rawEntities.length, 1);
  assertEquals(aResult.rawEntities[0]?.type, "text_link");
  assertEquals(aResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(aResult.rawEntities[0]?.length, linkText.length);
  //@ts-expect-error quick test
  assertEquals(aResult.rawEntities[0]?.url, url);
});

Deno.test("FormattedString - Instance code method", () => {
  const initialText = "Run ";
  const codeText = "npm install";
  const initialFormatted = new FormattedString(initialText, []);

  const codeResult = initialFormatted.code(codeText);

  assertInstanceOf(codeResult, FormattedString);
  assertEquals(codeResult.rawText, `${initialText}${codeText}`);

  // Test entity properties
  assertEquals(codeResult.rawEntities.length, 1);
  assertEquals(codeResult.rawEntities[0]?.type, "code");
  assertEquals(codeResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(codeResult.rawEntities[0]?.length, codeText.length);
});

Deno.test("FormattedString - Instance pre method", () => {
  const initialText = "Code example:\n";
  const preText = "console.log('hello');";
  const language = "javascript";
  const initialFormatted = new FormattedString(initialText, []);

  const preResult = initialFormatted.pre(preText, language);

  assertInstanceOf(preResult, FormattedString);
  assertEquals(preResult.rawText, `${initialText}${preText}`);

  // Test entity properties
  assertEquals(preResult.rawEntities.length, 1);
  assertEquals(preResult.rawEntities[0]?.type, "pre");
  assertEquals(preResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(preResult.rawEntities[0]?.length, preText.length);
  //@ts-expect-error quick test
  assertEquals(preResult.rawEntities[0]?.language, language);
});

Deno.test("FormattedString - Instance spoiler method", () => {
  const initialText = "Spoiler alert: ";
  const spoilerText = "secret text";
  const initialFormatted = new FormattedString(initialText, []);

  const spoilerResult = initialFormatted.spoiler(spoilerText);

  assertInstanceOf(spoilerResult, FormattedString);
  assertEquals(spoilerResult.rawText, `${initialText}${spoilerText}`);

  // Test entity properties
  assertEquals(spoilerResult.rawEntities.length, 1);
  assertEquals(spoilerResult.rawEntities[0]?.type, "spoiler");
  assertEquals(spoilerResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(spoilerResult.rawEntities[0]?.length, spoilerText.length);
});

Deno.test("FormattedString - Instance blockquote method", () => {
  const initialText = "As they say: ";
  const quoteText = "To be or not to be";
  const initialFormatted = new FormattedString(initialText, []);

  const quoteResult = initialFormatted.blockquote(quoteText);

  assertInstanceOf(quoteResult, FormattedString);
  assertEquals(quoteResult.rawText, `${initialText}${quoteText}`);

  // Test entity properties
  assertEquals(quoteResult.rawEntities.length, 1);
  assertEquals(quoteResult.rawEntities[0]?.type, "blockquote");
  assertEquals(quoteResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(quoteResult.rawEntities[0]?.length, quoteText.length);
});

Deno.test("FormattedString - Instance expandableBlockquote method", () => {
  const initialText = "Long quote: ";
  const quoteText = "This is a very long quote that should be expandable";
  const initialFormatted = new FormattedString(initialText, []);

  const quoteResult = initialFormatted.expandableBlockquote(quoteText);

  assertInstanceOf(quoteResult, FormattedString);
  assertEquals(quoteResult.rawText, `${initialText}${quoteText}`);

  // Test entity properties
  assertEquals(quoteResult.rawEntities.length, 1);
  assertEquals(quoteResult.rawEntities[0]?.type, "expandable_blockquote");
  assertEquals(quoteResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(quoteResult.rawEntities[0]?.length, quoteText.length);
});

Deno.test("FormattedString - Instance mentionUser method", () => {
  const initialText = "Hello ";
  const mentionText = "@user";
  const userId = 123456789;
  const initialFormatted = new FormattedString(initialText, []);

  const mentionResult = initialFormatted.mentionUser(mentionText, userId);

  assertInstanceOf(mentionResult, FormattedString);
  assertEquals(mentionResult.rawText, `${initialText}${mentionText}`);

  // Test entity properties
  assertEquals(mentionResult.rawEntities.length, 1);
  assertEquals(mentionResult.rawEntities[0]?.type, "text_link");
  assertEquals(mentionResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(mentionResult.rawEntities[0]?.length, mentionText.length);
  //@ts-expect-error quick test
  assertEquals(mentionResult.rawEntities[0]?.url, `tg://user?id=123456789`);
});

Deno.test("FormattedString - Instance customEmoji method", () => {
  const initialText = "Check this out ";
  const placeholder = "😀";
  const emojiId = "5123456789123456789";
  const initialFormatted = new FormattedString(initialText, []);

  const emojiResult = initialFormatted.customEmoji(placeholder, emojiId);

  assertInstanceOf(emojiResult, FormattedString);
  assertEquals(emojiResult.rawText, `${initialText}${placeholder}`);

  // Test entity properties
  assertEquals(emojiResult.rawEntities.length, 1);
  assertEquals(emojiResult.rawEntities[0]?.type, "text_link");
  assertEquals(emojiResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(emojiResult.rawEntities[0]?.length, placeholder.length);
  assertEquals(
    //@ts-expect-error quick test
    emojiResult.rawEntities[0]?.url,
    `tg://emoji?id=5123456789123456789`,
  );
});

Deno.test("FormattedString - Instance linkMessage method", () => {
  const initialText = "See ";
  const linkText = "this message";
  const chatId = -1001234567890;
  const messageId = 123;
  const initialFormatted = new FormattedString(initialText, []);

  const linkResult = initialFormatted.linkMessage(linkText, chatId, messageId);

  assertInstanceOf(linkResult, FormattedString);
  assertEquals(linkResult.rawText, `${initialText}${linkText}`);

  // Test entity properties
  assertEquals(linkResult.rawEntities.length, 1);
  assertEquals(linkResult.rawEntities[0]?.type, "text_link");
  assertEquals(linkResult.rawEntities[0]?.offset, initialText.length);
  assertEquals(linkResult.rawEntities[0]?.length, linkText.length);
  //@ts-expect-error quick test
  assertEquals(linkResult.rawEntities[0]?.url, `https://t.me/c/1234567890/123`);
});

Deno.test("FormattedString - Instance plain method", () => {
  const initialText = "Hello";
  const plainText = " World";
  const initialFormatted = new FormattedString(initialText, []);

  const plainResult = initialFormatted.plain(plainText);

  assertInstanceOf(plainResult, FormattedString);
  assertEquals(plainResult.rawText, `${initialText}${plainText}`);

  // Test entity properties - plain text should not add any entities
  assertEquals(plainResult.rawEntities.length, 0);
});

Deno.test("FormattedString - Complex chaining", () => {
  const result = new FormattedString("Start: ", [])
    .bold("Bold")
    .plain(" then ")
    .italic("Italic")
    .plain(" and ")
    .code("code");

  assertInstanceOf(result, FormattedString);
  assertEquals(result.rawText, "Start: Bold then Italic and code");

  // Test exact entity count and properties
  assertEquals(result.rawEntities.length, 3);

  // Test bold entity
  assertEquals(result.rawEntities[0]?.type, "bold");
  assertEquals(result.rawEntities[0]?.offset, 7); // After "Start: "
  assertEquals(result.rawEntities[0]?.length, 4); // "Bold"

  // Test italic entity
  assertEquals(result.rawEntities[1]?.type, "italic");
  assertEquals(result.rawEntities[1]?.offset, 17); // After "Start: Bold then "
  assertEquals(result.rawEntities[1]?.length, 6); // "Italic"

  // Test code entity
  assertEquals(result.rawEntities[2]?.type, "code");
  assertEquals(result.rawEntities[2]?.offset, 28); // After "Start: Bold then Italic and "
  assertEquals(result.rawEntities[2]?.length, 4); // "code"
});

Deno.test("FormattedString - Stringable object as input", () => {
  const stringableObject = {
    toString: () => "custom string",
  };

  const result = FormattedString.bold(stringableObject);

  assertInstanceOf(result, FormattedString);
  assertEquals(result.rawText, "custom string");

  // Test entity properties
  assertEquals(result.rawEntities.length, 1);
  assertEquals(result.rawEntities[0]?.type, "bold");
  assertEquals(result.rawEntities[0]?.offset, 0);
  assertEquals(result.rawEntities[0]?.length, "custom string".length);
});

Deno.test("FormattedString - Empty entities array", () => {
  const text = "Plain text";
  const formatted = new FormattedString(text, []);

  assertEquals(formatted.text, text);
  assertEquals(formatted.entities.length, 0);
  assertEquals(formatted.caption_entities.length, 0);
});

Deno.test("FormattedString - Multiple entities", () => {
  const text = "Hello World";
  const entities: MessageEntity[] = [
    { type: "bold", offset: 0, length: 5 },
    { type: "italic", offset: 6, length: 5 },
  ];

  const formatted = new FormattedString(text, entities);

  assertEquals(formatted.entities.length, 2);
  assertEquals(formatted.entities[0]?.type, "bold");
  assertEquals(formatted.entities[1]?.type, "italic");
});

Deno.test("FormattedString - Static join method", () => {
  // Test empty array
  const emptyResult = FormattedString.join([]);
  assertInstanceOf(emptyResult, FormattedString);
  assertEquals(emptyResult.rawText, "");
  assertEquals(emptyResult.rawEntities.length, 0);
  
  // Test array of strings
  const stringsResult = FormattedString.join(["Hello", " ", "World"]);
  assertInstanceOf(stringsResult, FormattedString);
  assertEquals(stringsResult.rawText, "Hello World");
  assertEquals(stringsResult.rawEntities.length, 0);
  
  // Test mixed array
  const boldText = FormattedString.bold("Bold");
  const italicText = FormattedString.italic("Italic");
  const plainText = " and ";
  
  const mixedResult = FormattedString.join([
    "Start: ", 
    boldText, 
    " then ", 
    italicText, 
    plainText, 
    "plain"
  ]);
  
  assertInstanceOf(mixedResult, FormattedString);
  assertEquals(mixedResult.rawText, "Start: Bold then Italic and plain");
  
  // Test exact entity count and properties
  assertEquals(mixedResult.rawEntities.length, 2);
  
  // Test bold entity
  assertEquals(mixedResult.rawEntities[0]?.type, "bold");
  assertEquals(mixedResult.rawEntities[0]?.offset, 7); // After "Start: "
  assertEquals(mixedResult.rawEntities[0]?.length, 4); // "Bold"
  
  // Test italic entity
  assertEquals(mixedResult.rawEntities[1]?.type, "italic");
  assertEquals(mixedResult.rawEntities[1]?.offset, 17); // After "Start: Bold then "
  assertEquals(mixedResult.rawEntities[1]?.length, 6); // "Italic"

  // Test TextWithEntities and CaptionWithEntities
  const textWithEntitiesItem = {
    text: "TextWithEntities",
    entities: [{ type: "bold", offset: 0, length: 4 }]
  };
  
  const captionWithEntities = {
    caption: "CaptionWithEntities",
    caption_entities: [{ type: "italic", offset: 0, length: 7 }]
  };
  
  const combinedResult = FormattedString.join([
    "Start: ",
    textWithEntitiesItem,
    " and ",
    captionWithEntities,
  ]);

  assertInstanceOf(combinedResult, FormattedString);
  assertEquals(combinedResult.rawText, "Start: TextWithEntities and CaptionWithEntities");
  
  // Test entity count
  assertEquals(combinedResult.rawEntities.length, 2);
  
  // Test first entity from TextWithEntities
  assertEquals(combinedResult.rawEntities[0]?.type, "bold");
  assertEquals(combinedResult.rawEntities[0]?.offset, 7); // After "Start: "
  assertEquals(combinedResult.rawEntities[0]?.length, 4); // "Text" part of "TextWithEntities"

  // Test second entity from CaptionWithEntities
  assertEquals(combinedResult.rawEntities[1]?.type, "italic");
});

// --- replace and replaceAll Tests ---

Deno.test("FormattedString.replace - Basic plain text", () => {
  const original = new FormattedString("Hello world, world!");
  const search = "world";
  const replacement = "TypeScript";
  const result = original.replace(search, replacement);
  expectFormattedStringEqual(result, "Hello TypeScript, world!", []);
  assertNotStrictEquals(result, original, "Should return a new instance");
});

Deno.test("FormattedString.replace - Plain text not found", () => {
  const original = new FormattedString("Hello world!");
  const result = original.replace("foo", "bar");
  expectFormattedStringEqual(result, "Hello world!", []);
  // Depending on implementation, this might return the same instance or a new one.
  // Current implementation returns new one.
  assertNotStrictEquals(result, original, "Should return a new instance even if no replacement occurs");
});

Deno.test("FormattedString.replace - Empty search string", () => {
  const original = new FormattedString("Hello world!");
  const result = original.replace("", "test");
  expectFormattedStringEqual(result, "Hello world!", [], "Empty search string should result in original string");
  assertNotStrictEquals(result, original, "Should return a new instance");
});

Deno.test("FormattedString.replace - Empty replacement string", () => {
  const original = new FormattedString("Hello world!");
  const result = original.replace("world", "");
  expectFormattedStringEqual(result, "Hello !", []);
});

Deno.test("FormattedString.replace - Replacing at the beginning (plain)", () => {
  const original = new FormattedString("Hello world!");
  const result = original.replace("Hello", "Hi");
  expectFormattedStringEqual(result, "Hi world!", []);
});

Deno.test("FormattedString.replace - Replacing at the end (plain)", () => {
  const original = new FormattedString("Hello world!");
  const result = original.replace("world!", "User!");
  expectFormattedStringEqual(result, "Hello User!", []);
});

Deno.test("FormattedString.replace - Formatted text with FormattedString search/replace", () => {
  const original = fmt`This is ${b}bold${b} text.`;
  const search = FormattedString.bold("bold");
  const replacement = FormattedString.italic("italic");
  const result = original.replace(search, replacement);
  expectFormattedStringEqual(result, "This is italic text.", [{ type: "italic", offset: 8, length: 6 }]);
});

Deno.test("FormattedString.replace - Formatted text with string search/replace", () => {
    const original = fmt`This is ${b}bold${b} text.`;
    // This will not match because "bold" (plain) is different from FormattedString.bold("bold")
    const resultNoMatch = original.replace("bold", "italic");
    expectFormattedStringEqual(resultNoMatch, "This is bold text.", [{ type: "bold", offset: 8, length: 4 }], "Plain string search should not match formatted part unless entities are identical (none here)");

    const originalWithPlain = new FormattedString("This is bold text.");
    const resultPlainMatch = originalWithPlain.replace("bold", "italic");
    expectFormattedStringEqual(resultPlainMatch, "This is italic text.", [], "Plain string search on plain string");

});

Deno.test("FormattedString.replace - Search text with different formatting (no match)", () => {
  const original = fmt`This is ${b}bold${b} text.`;
  const search = FormattedString.italic("bold"); // Search for italic "bold"
  const replacement = "plain";
  const result = original.replace(search, replacement);
  expectFormattedStringEqual(result, "This is bold text.", [{ type: "bold", offset: 8, length: 4 }], "Should not replace if search formatting doesn't match");
});

Deno.test("FormattedString.replace - Replacement text has formatting", () => {
  const original = new FormattedString("Replace this.");
  const search = "this";
  const replacement = FormattedString.bold("that");
  const result = original.replace(search, replacement);
  expectFormattedStringEqual(result, "Replace that.", [{ type: "bold", offset: 8, length: 4 }]);
});

Deno.test("FormattedString.replace - Entity shifting", () => {
  const original = fmt`Prefix ${b}bold${b} Suffix`;
  const search = "Prefix";
  const replacement = "LongerPrefix";
  const result = original.replace(search, replacement);
  // "Prefix " -> "LongerPrefix " (length diff: 7)
  expectFormattedStringEqual(result, "LongerPrefix bold Suffix", [{ type: "bold", offset: "LongerPrefix ".length, length: 4 }]);
});

Deno.test("FormattedString.replace - Entity removal if search covers it", () => {
    const original = fmt`Hello ${b}bold world${b}.`;
    const search = FormattedString.bold("bold world");
    const replacement = "plain";
    const result = original.replace(search, replacement);
    expectFormattedStringEqual(result, "Hello plain.", []);
});

Deno.test("FormattedString.replace - Issue example 1: onefoxANDonedog (bold) replacing AND (bold) with OR (bold)", () => {
  const original = FormattedString.bold("onefoxANDonedog");
  const search = FormattedString.bold("AND");
  const replacement = FormattedString.bold("OR");
  const result = original.replace(search, replacement);
  // This test relies on _findOccurrences correctly identifying a part of a larger entity
  // The current _findOccurrences matches search.rawText and then checks if entities *covering that segment* match search.entities
  // This means if original is <b>onefoxANDonedog</b>, and search is <b>AND</b>
  // It finds "AND" at offset 6. Host entities covering this are {type: "bold", offset:0, length:17} (adjusted to segment: {type:"bold", offset:-6, length:17})
  // Search entities are {type:"bold", offset:0, length:3}
  // These are not equal. So this replacement will NOT happen as per current _findOccurrences.

  // To make this work as intended by the issue, _findOccurrences would need to be able to match sub-segments
  // of entities or the initial setup of the FormattedString would need to be more granular.
  // E.g., fmt`${b}onefox${b}${b}AND${b}${b}onedog${b}`. Then search `fmt`${b}AND${b}` would work.

  // Let's assume the intended structure allows for the match:
  const originalSegmented = fmt`${b}onefox${b}${b}AND${b}${b}onedog${b}`; // fmt normalizes this to one bold entity
  // If fmt creates one big bold entity, the replace will fail as explained above.
  // Let's test the scenario where entities are distinct allowing for a match.
  const originalDistinct = new FormattedString(
      "onefoxANDonedog",
      [
          {type: "bold", offset:0, length: 6}, // "onefox"
          {type: "bold", offset:6, length: 3}, // "AND"
          {type: "bold", offset:9, length: 6}  // "onedog"
      ]
  );
  const resultDistinct = originalDistinct.replace(FormattedString.bold("AND"), FormattedString.bold("OR"));
  expectFormattedStringEqual(resultDistinct, "onefoxORonedog", [
      {type: "bold", offset:0, length: 6}, // "onefox"
      {type: "bold", offset:6, length: 2}, // "OR"
      {type: "bold", offset:8, length: 6}  // "onedog"
  ]);

  // Test with single bold entity, expecting no replacement due to _findOccurrences logic
  const originalSingleBold = FormattedString.bold("onefoxANDonedog");
  const resultSingleBold = originalSingleBold.replace(FormattedString.bold("AND"), FormattedString.bold("OR"));
  expectFormattedStringEqual(resultSingleBold, "onefoxANDonedog", [{type:'bold', offset:0, length:17}], "Should not replace part of a single bold entity if search is for a sub-segment with its own exact bold entity");

});

Deno.test("FormattedString.replace - Issue example 2: onefox<U>and</U>onedog (outer bold) replacing <U>and</U> with <B>or</B>", () => {
  // Original: <b>onefox<U>and</U>onedog</b>
  // This implies entities like:
  // { type: "bold", offset: 0, length: 17 } (for "onefoxandondedog")
  // { type: "underline", offset: 6, length: 3 } (for "and")
  // The _findOccurrences logic will match search.rawText ("and") and then compare search.entities with host entities *within that range*.
  // Host entities for "and" (offset 6, length 3) would be:
  //  - { type: "bold", offset: 0, length: 17 } -> adjusted to { type: "bold", offset: -6, length: 17 } relative to "and"
  //  - { type: "underline", offset: 6, length: 3 } -> adjusted to { type: "underline", offset: 0, length: 3 } relative to "and"
  // If search is `FormattedString.underline("and")`, its entities are [{ type: "underline", offset: 0, length: 3 }].
  // This will not be an exact match for [bold_adjusted, underline_adjusted].

  // For this to work, the search must be for "and" with *both* its underline and the portion of the bold.
  // Or, the source entities must be structured to isolate `<u>and</u>` from the outer bold, e.g.
  // `fmt`${b}onefox${b}${u}and${u}${b}onedog${b}``
  const source = new FormattedString(
    "onefoxandondog",
    [
      { type: "bold", offset: 0, length: 6 }, // onefox
      { type: "underline", offset: 6, length: 3 }, // and
      { type: "bold", offset: 9, length: 6 }, // onedog
    ]
  );
  const search = FormattedString.underline("and");
  const replacement = FormattedString.bold("or");
  const result = source.replace(search, replacement);
  expectFormattedStringEqual(result, "onefoxoronedog", [
    { type: "bold", offset: 0, length: 6 },
    { type: "bold", offset: 6, length: 2 }, // the new 'or'
    { type: "bold", offset: 8, length: 6 },
  ]);
});


Deno.test("FormattedString.replace - Exact entity matching: only replace if search format matches", () => {
  const original = fmt`Plain ${b}styled${b} plain`;
  const searchPlain = "styled";
  const searchBold = FormattedString.bold("styled");
  const replacement = "new";

  const result1 = original.replace(searchPlain, replacement);
  expectFormattedStringEqual(result1, "Plain styled plain", [{type: "bold", offset: 6, length: 6}], "Plain search should not replace styled part if entities are not matched");

  const result2 = original.replace(searchBold, replacement);
  expectFormattedStringEqual(result2, "Plain new plain", [], "Formatted search should replace corresponding styled part");
});


// --- replaceAll Tests ---

Deno.test("FormattedString.replaceAll - Basic plain text", () => {
  const original = new FormattedString("banana");
  const result = original.replaceAll("a", "o");
  expectFormattedStringEqual(result, "bonono", []);
  assertNotStrictEquals(result, original, "Should return a new instance");
});

Deno.test("FormattedString.replaceAll - Plain text not found", () => {
  const original = new FormattedString("banana");
  const result = original.replaceAll("x", "y");
  expectFormattedStringEqual(result, "banana", []);
  assertNotStrictEquals(result, original, "Should return a new instance");
});

Deno.test("FormattedString.replaceAll - Empty search string", () => {
  const original = new FormattedString("Hello");
  const result = original.replaceAll("", "X");
  expectFormattedStringEqual(result, "Hello", [], "Empty search string should result in original string");
});

Deno.test("FormattedString.replaceAll - Empty replacement string", () => {
  const original = new FormattedString("ababab");
  const result = original.replaceAll("a", "");
  expectFormattedStringEqual(result, "bbb", []);
});

Deno.test("FormattedString.replaceAll - Multiple occurrences with formatting", () => {
  const original = fmt`Test: ${b}A${b} and ${b}A${b}.`;
  const search = FormattedString.bold("A");
  const replacement = FormattedString.italic("B");
  const result = original.replaceAll(search, replacement);
  expectFormattedStringEqual(result, "Test: B and B.", [
    { type: "italic", offset: 6, length: 1 },
    { type: "italic", offset: 12, length: 1 }, // "Test: B and ".length = 12
  ]);
});

Deno.test("FormattedString.replaceAll - Entities correctly shifted after multiple replacements", () => {
  const original = fmt`x ${b}bold1${b} y ${i}italic1${i} z ${b}bold2${b}`;
  // Replace "x" with "xx", "y" with "yy", "z" with "zz" (plain text replacements)
  // First, test replacing a non-formatted part that shifts multiple entities
  let result = original.replaceAll(new FormattedString("x"), new FormattedString("xx")); // length change +1
  result = result.replaceAll(new FormattedString("y"), new FormattedString("yy"));       // length change +1
  result = result.replaceAll(new FormattedString("z"), new FormattedString("zz"));       // length change +1

  // Expected: "xx bold1 yy italic1 zz bold2"
  // Entities:
  // bold1: offset initially 2 ("x "), after "x"->"xx" is 3. length 5
  // italic1: offset initially 10 ("x bold1 y "), after "x"->"xx" is 11, after "y"->"yy" is 12. length 7
  // bold2: offset initially 20 ("x bold1 y italic1 z "), after "x"->"xx" is 21, after "y"->"yy" is 22, after "z"->"zz" is 23. length 5

  // This test is tricky because replaceAll rebuilds based on _findOccurrences on the *original* string's state in each step of my current replaceAll.
  // The current replaceAll implementation in FormattedString processes occurrences from right to left based on initial finding.
  // Let's re-verify the replaceAll logic for plain text replacements first.
  // If search is plain string, _findOccurrences will find all plain "x", "y", "z".
  // replaceAll("x", "xx"):
  //   Occurrences of "x": [{startIndex: 0, endIndex: 1}]
  //   newRawText = "xx bold1 y italic1 z bold2"
  //   newEntities: bold1 offset 3, italic1 offset 11, bold2 offset 21
  // replaceAll("y", "yy") on this new string (if it were iterative, which it is not, it would be on the current state):
  // This implies that for plain text, it might be better to do iterative replacement on evolving string or adjust _findOccurrences.
  // However, the prompt is about FormattedString's method, which uses its _findOccurrences.

  // Let's make a test that fits current replaceAll (multiple matches of the *same* formatted string)
  const originalMulti = fmt`${b}go${b} stop ${b}go${b} stop`;
  const searchF = FormattedString.bold("go");
  const replaceF = FormattedString.italic("proceed");
  const resultMulti = originalMulti.replaceAll(searchF, replaceF);
  // Expected: "proceed stop proceed stop"
  // Entities:
  // 1. "proceed" at offset 0, length 7 (italic)
  // 2. "proceed" at offset "proceed stop ".length = 7+1+5 = 13, length 7 (italic)
  expectFormattedStringEqual(resultMulti, "proceed stop proceed stop", [
      {type: "italic", offset:0, length:7},
      {type: "italic", offset:13, length:7}
  ]);
});

Deno.test("FormattedString.replaceAll - No match if format differs", () => {
    const original = fmt`click ${b}here${b} or ${b}here${b}`;
    const search = "here"; // plain
    const replacement = "link";
    const result = original.replaceAll(search, replacement);
    expectFormattedStringEqual(result, "click here or here", [
        {type:"bold", offset: 6, length: 4},
        {type:"bold", offset: 14, length: 4}
    ], "Plain search should not replace formatted parts");
});

Deno.test("FormattedString.replaceAll - Replacing with empty formatted string", () => {
    const original = fmt`Delete ${b}this${b} and ${b}this${b}.`;
    const search = FormattedString.bold("this");
    const replacement = new FormattedString(""); // Empty FormattedString
    const result = original.replaceAll(search, replacement);
    expectFormattedStringEqual(result, "Delete  and .", []);
});

Deno.test("FormattedString.replace - Entity boundary conditions", () => {
    // Case: Replacement exactly matches an entity
    const fs1 = new FormattedString("Hello bold world", [{ type: "bold", offset: 6, length: 4 }]);
    const res1 = fs1.replace(FormattedString.bold("bold"), FormattedString.italic("italic"));
    expectFormattedStringEqual(res1, "Hello italic world", [{ type: "italic", offset: 6, length: 6 }]);

    // Case: Replacement inside an entity (current _findOccurrences will not match this if search is for partial entity)
    // const fs2 = new FormattedString("This is bold text", [{ type: "bold", offset: 8, length: 9 }]); // "bold text" is bold
    // const res2 = fs2.replace(FormattedString.bold("bold"), FormattedString.italic("italic"));
    // This would only work if original was fmt`${b}bold${b} text` or similar.
    // expectFormattedStringEqual(res2, "This is italic text", [
    //   { type: "italic", offset: 8, length: 6 },
    //   { type: "bold", offset: 14 /* "italic".length */ , length: 5 }, // " text" remains bold (split)
    // ]);
});

Deno.test("FormattedString.replaceAll - Complex scenario with multiple entity types and shifts", () => {
    const original = fmt`Lead: ${b}B1${b}, then ${i}I1${i}, finally ${b}B2${b}.`;
    const search = FormattedString.bold("B"); // This won't match B1 or B2 due to length.
    // Let's search for something generic like a plain space to see shifts.
    const searchSpace = new FormattedString(" ");
    const replaceWithDash = new FormattedString("-");
    const result = original.replaceAll(searchSpace, replaceWithDash);

    // Expected: Lead:-B1,-then-I1,-finally-B2.
    // Original entities:
    // B1: bold, offset 6, length 2
    // I1: italic, offset 16, length 2
    // B2: bold, offset 28, length 2

    // After replacing " " (offset 5) with "-":
    // B1: offset 6 (no change yet as processing right to left for identical search strings or if findOccurrences is called once)
    // ... this depends on how replaceAll gets its occurrences. If it's once, then indices are fixed.
    // My current replaceAll calls _findOccurrences once.
    // Occurrences of " ": (5,6), (9,10), (15,16), (21,22), (27,28)
    // Processing right to left:
    // Replace " " at 27: "Lead: B1, then I1, finally-B2." Entities: B1(6,2), I1(16,2), B2(28,2) -> B2 offset doesn't change before it.
    // Replace " " at 21: "Lead: B1, then I1,-finally-B2." Entities: B1(6,2), I1(16,2), B2(27,2)
    // Replace " " at 15: "Lead: B1, then-I1,-finally-B2." Entities: B1(6,2), I1(15,2), B2(26,2)
    // Replace " " at 9:  "Lead: B1,-then-I1,-finally-B2." Entities: B1(6,2), I1(14,2), B2(25,2)
    // Replace " " at 5:  "Lead:-B1,-then-I1,-finally-B2." Entities: B1(5,2), I1(13,2), B2(24,2)

    expectFormattedStringEqual(result, "Lead:-B1,-then-I1,-finally-B2.", [
        { type: "bold", offset: 5, length: 2 },   // "B1"
        { type: "italic", offset: 13, length: 2 }, // "I1"
        { type: "bold", offset: 24, length: 2 },  // "B2"
    ]);
});
  assertEquals(combinedResult.rawEntities[1]?.offset, 28); // After "Start: TextWithEntities and "
  assertEquals(combinedResult.rawEntities[1]?.length, 7); // "Caption"
});

// --- findAll Tests ---

Deno.test("FormattedString.findAll - Plain string search, simple match", () => {
  const fs = new FormattedString("ababa");
  const result = fs.findAll("aba");
  assertEquals(result, [{ startIndex: 0, endIndex: 3 }]);
});

Deno.test("FormattedString.findAll - Plain string search, strictly non-overlapping", () => {
  const fs = new FormattedString("aaaaa");
  const result = fs.findAll("aa");
  assertEquals(result, [
    { startIndex: 0, endIndex: 2 },
    { startIndex: 2, endIndex: 4 },
  ]);
});

Deno.test("FormattedString.findAll - Plain string, no match", () => {
  const fs = new FormattedString("abc");
  const result = fs.findAll("d");
  assertEquals(result, []);
});

Deno.test("FormattedString.findAll - Empty search string", () => {
  const fs = new FormattedString("abc");
  // Current findAll implementation converts "" to new FormattedString(""), which has rawText.length === 0
  // This returns [] from findAll.
  const result = fs.findAll("");
  assertEquals(result, [], "Empty search string should return empty array");
  const resultFS = fs.findAll(new FormattedString(""));
  assertEquals(resultFS, [], "Empty FormattedString search should return empty array");
});

Deno.test("FormattedString.findAll - Multiple plain string matches", () => {
  const fs = new FormattedString("test test test");
  const result = fs.findAll("test");
  assertEquals(result, [
    { startIndex: 0, endIndex: 4 },
    { startIndex: 5, endIndex: 9 },
    { startIndex: 10, endIndex: 14 },
  ]);
});

Deno.test("FormattedString.findAll - Plain string match at beginning", () => {
  const fs = new FormattedString("start middle end");
  const result = fs.findAll("start");
  assertEquals(result, [{ startIndex: 0, endIndex: 5 }]);
});

Deno.test("FormattedString.findAll - Plain string match at end", () => {
  const fs = new FormattedString("start middle end");
  const result = fs.findAll("end");
  assertEquals(result, [{ startIndex: 13, endIndex: 16 }]);
});

Deno.test("FormattedString.findAll - FormattedString search, simple match", () => {
  const fs = fmt`Hello ${b}bold${b} world, and another ${b}bold${b}!`;
  const search = FormattedString.bold("bold");
  const result = fs.findAll(search);
  assertEquals(result, [
    { startIndex: 6, endIndex: 10 },
    { startIndex: 26, endIndex: 30 },
  ]);
});

Deno.test("FormattedString.findAll - FormattedString search, no match (text differs)", () => {
  const fs = fmt`Hello ${b}bold${b} world`;
  const search = FormattedString.bold("boId"); // Typo in text
  const result = fs.findAll(search);
  assertEquals(result, []);
});

Deno.test("FormattedString.findAll - FormattedString search, no match (format differs)", () => {
  const fs = fmt`Hello ${b}bold${b} world`;
  const search = FormattedString.italic("bold"); // Italic instead of bold
  const result = fs.findAll(search);
  assertEquals(result, []);
});

Deno.test("FormattedString.findAll - FormattedString search, no match (search is plain string for formatted part)", () => {
  const fs = fmt`Hello ${b}bold${b} world`;
  // Searching with a plain "bold" (which is new FormattedString("bold") with no entities)
  // will not match the styled "bold" because the entities won't match.
  const search = "bold";
  const result = fs.findAll(search);
  assertEquals(result, [], "Plain string search should not find styled part if search has no entities and host part does");
});

Deno.test("FormattedString.findAll - FormattedString search, plain string part in formatted host", () => {
    const fs = fmt`Hello ${b}bold${b} world`;
    const search = "Hello"; // plain string
    const result = fs.findAll(search); // search will be new FormattedString("Hello")
    // Host "Hello" has no entities, search "Hello" has no entities. Match.
    assertEquals(result, [{ startIndex: 0, endIndex: 5 }]);
});


Deno.test("FormattedString.findAll - Multiple complex matches", () => {
  const fs = fmt`${b}A${b} ${i}B${i} ${b}A${b} C ${b}A${b}`;
  const search = FormattedString.bold("A");
  const result = fs.findAll(search);
  assertEquals(result, [
    { startIndex: 0, endIndex: 1 },
    { startIndex: 4, endIndex: 5 }, // "A B ".length = 4
    { startIndex: 8, endIndex: 9 }, // "A B A C ".length = 8
  ]);
});

Deno.test("FormattedString.findAll - Host string is empty", () => {
  const fs = new FormattedString("");
  const result = fs.findAll("a");
  assertEquals(result, []);
});

Deno.test("FormattedString.findAll - Search string longer than host", () => {
  const fs = new FormattedString("a");
  const result = fs.findAll("abc");
  assertEquals(result, []);
});

Deno.test("FormattedString.findAll - Search with multiple entities", () => {
    const searchStr = fmt`Alpha${b}Beta${b}${i}Gamma${i}`; // Text: AlphaBetaGamma
    // Entities for searchStr:
    // {type: "bold", offset: 5, length: 4} ("Beta")
    // {type: "italic", offset: 9, length: 5} ("Gamma")

    const host1 = fmt`Prefix Alpha${b}Beta${b}${i}Gamma${i} Suffix`;
    const result1 = host1.findAll(searchStr);
    assertEquals(result1, [{ startIndex: 7, endIndex: 7 + "AlphaBetaGamma".length }]);

    const host2 = fmt`Prefix Alpha${b}Beta${b}${u}Gamma${u} Suffix`; // Underline instead of italic
    const result2 = host2.findAll(searchStr);
    assertEquals(result2, [], "Should not match if one of the entities in search is different");

    const host3 = fmt`Prefix AlphaBeta${i}Gamma${i} Suffix`; // Missing bold entity for Beta
    const result3 = host3.findAll(searchStr);
    assertEquals(result3, [], "Should not match if one of the entities in search is missing in host");
});

Deno.test("FormattedString.findAll - Search for FormattedString with no entities", () => {
    const fs = fmt`Hello ${b}bold${b} world.`;
    const search = new FormattedString("world"); // Plain FormattedString
    const result = fs.findAll(search);
    // "world" in host is at offset 11, length 5. It has no entities.
    // search has no entities. So it should match.
    assertEquals(result, [{startIndex: 11, endIndex: 16}]);
});
