import type { MessageEntity } from "./deps.deno.ts";

/**
 * FSM states for the HTML parser
 */
const enum State {
  TEXT,
  TAG_OPEN,
  TAG_NAME,
  CLOSE_TAG_NAME,
  ATTR_SPACE,
  ATTR_NAME,
  ATTR_VALUE_START,
  ATTR_VALUE,
  ENTITY,
}

/**
 * Maps HTML tag names to MessageEntity types
 */
const TAG_TO_ENTITY_TYPE: Record<string, MessageEntity["type"] | undefined> = {
  b: "bold",
  strong: "bold",
  i: "italic",
  em: "italic",
  u: "underline",
  ins: "underline",
  s: "strikethrough",
  strike: "strikethrough",
  del: "strikethrough",
  code: "code",
  pre: "pre",
  blockquote: "blockquote",
  span: undefined, // needs class="tg-spoiler"
  "tg-spoiler": "spoiler",
  "tg-emoji": "custom_emoji",
  a: "text_link",
};

/**
 * Named HTML entities
 */
const NAMED_ENTITIES: Record<string, string> = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
  copy: "\u00A9",
  reg: "\u00AE",
  trade: "\u2122",
  euro: "\u20AC",
  pound: "\u00A3",
  yen: "\u00A5",
  cent: "\u00A2",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  laquo: "\u00AB",
  raquo: "\u00BB",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  bull: "\u2022",
  middot: "\u00B7",
  deg: "\u00B0",
  plusmn: "\u00B1",
  times: "\u00D7",
  divide: "\u00F7",
  frac12: "\u00BD",
  frac14: "\u00BC",
  frac34: "\u00BE",
};

/**
 * Tag stack entry for tracking open tags
 */
interface TagStackEntry {
  tag: string;
  entityType: MessageEntity["type"];
  offset: number;
  attrs: Record<string, string>;
}

/**
 * Decodes an HTML entity string (without & and ;)
 */
function decodeEntity(entity: string): string {
  if (entity.startsWith("#x") || entity.startsWith("#X")) {
    const code = parseInt(entity.slice(2), 16);
    return isNaN(code) ? `&${entity};` : String.fromCodePoint(code);
  }
  if (entity.startsWith("#")) {
    const code = parseInt(entity.slice(1), 10);
    return isNaN(code) ? `&${entity};` : String.fromCodePoint(code);
  }
  return NAMED_ENTITIES[entity] ?? `&${entity};`;
}

/**
 * Parses Telegram Bot API HTML into plain text and MessageEntity array.
 * Uses a character-streaming FSM approach to minimize regex and O(n) operations.
 *
 * @param html The HTML string to parse
 * @returns Object with text (plain text) and entities (MessageEntity array)
 */
export function parseHtml(
  html: string,
): { text: string; entities: MessageEntity[] } {
  let state: State = State.TEXT;
  let output = "";
  const entities: MessageEntity[] = [];
  const tagStack: TagStackEntry[] = [];

  let currentTag = "";
  let currentAttrName = "";
  let currentAttrValue = "";
  let attrQuoteChar = "";
  let currentAttrs: Record<string, string> = {};
  let entityBuffer = "";

  for (let i = 0; i < html.length; i++) {
    const char = html[i];

    switch (state) {
      case State.TEXT:
        if (char === "<") {
          state = State.TAG_OPEN;
          currentTag = "";
          currentAttrs = {};
        } else if (char === "&") {
          state = State.ENTITY;
          entityBuffer = "";
        } else {
          output += char;
        }
        break;

      case State.TAG_OPEN:
        if (char === "/") {
          state = State.CLOSE_TAG_NAME;
        } else if (
          char === ">" || char === " " || char === "\t" || char === "\n" ||
          char === "\r"
        ) {
          // Empty tag like "<>" - treat as text
          output += "<" + char;
          state = State.TEXT;
        } else {
          currentTag = char.toLowerCase();
          state = State.TAG_NAME;
        }
        break;

      case State.TAG_NAME:
        if (char === ">") {
          handleOpenTag(currentTag, currentAttrs, output.length, tagStack);
          state = State.TEXT;
        } else if (
          char === " " || char === "\t" || char === "\n" || char === "\r"
        ) {
          state = State.ATTR_SPACE;
        } else if (char === "/") {
          // Self-closing tag start, wait for >
        } else {
          currentTag += char.toLowerCase();
        }
        break;

      case State.CLOSE_TAG_NAME:
        if (char === ">") {
          handleCloseTag(currentTag, output.length, tagStack, entities);
          state = State.TEXT;
        } else if (
          char !== " " && char !== "\t" && char !== "\n" && char !== "\r"
        ) {
          currentTag += char.toLowerCase();
        }
        break;

      case State.ATTR_SPACE:
        if (char === ">") {
          handleOpenTag(currentTag, currentAttrs, output.length, tagStack);
          state = State.TEXT;
        } else if (char === "/") {
          // Self-closing tag marker
        } else if (
          char !== " " && char !== "\t" && char !== "\n" && char !== "\r"
        ) {
          currentAttrName = char.toLowerCase();
          state = State.ATTR_NAME;
        }
        break;

      case State.ATTR_NAME:
        if (char === "=") {
          state = State.ATTR_VALUE_START;
        } else if (char === ">") {
          // Boolean attribute
          currentAttrs[currentAttrName] = "";
          handleOpenTag(currentTag, currentAttrs, output.length, tagStack);
          state = State.TEXT;
        } else if (
          char === " " || char === "\t" || char === "\n" || char === "\r"
        ) {
          // Boolean attribute, look for next attr or end
          currentAttrs[currentAttrName] = "";
          state = State.ATTR_SPACE;
        } else if (char === "/") {
          // Self-closing with boolean attr
          currentAttrs[currentAttrName] = "";
        } else {
          currentAttrName += char.toLowerCase();
        }
        break;

      case State.ATTR_VALUE_START:
        if (char === '"' || char === "'") {
          attrQuoteChar = char;
          currentAttrValue = "";
          state = State.ATTR_VALUE;
        } else if (char === ">") {
          // Empty attribute value
          currentAttrs[currentAttrName] = "";
          handleOpenTag(currentTag, currentAttrs, output.length, tagStack);
          state = State.TEXT;
        } else if (
          char !== " " && char !== "\t" && char !== "\n" && char !== "\r"
        ) {
          // Unquoted attribute value
          currentAttrValue = char;
          attrQuoteChar = "";
          state = State.ATTR_VALUE;
        }
        break;

      case State.ATTR_VALUE:
        if (attrQuoteChar && char === attrQuoteChar) {
          currentAttrs[currentAttrName] = currentAttrValue;
          state = State.ATTR_SPACE;
        } else if (
          !attrQuoteChar &&
          (char === " " || char === "\t" || char === "\n" || char === "\r")
        ) {
          currentAttrs[currentAttrName] = currentAttrValue;
          state = State.ATTR_SPACE;
        } else if (!attrQuoteChar && char === ">") {
          currentAttrs[currentAttrName] = currentAttrValue;
          handleOpenTag(currentTag, currentAttrs, output.length, tagStack);
          state = State.TEXT;
        } else {
          currentAttrValue += char;
        }
        break;

      case State.ENTITY:
        if (char === ";") {
          output += decodeEntity(entityBuffer);
          state = State.TEXT;
        } else if (char === "<") {
          // Malformed entity, output as-is and process tag
          output += "&" + entityBuffer;
          state = State.TAG_OPEN;
          currentTag = "";
          currentAttrs = {};
        } else if (char === "&") {
          // Another & before ; - output previous and start new
          output += "&" + entityBuffer;
          entityBuffer = "";
        } else if (
          char === " " || char === "\t" || char === "\n" || char === "\r"
        ) {
          // Malformed entity, output as-is
          output += "&" + entityBuffer + char;
          state = State.TEXT;
        } else {
          entityBuffer += char;
        }
        break;
    }
  }

  // Handle any unclosed state
  if (state === State.ENTITY) {
    output += "&" + entityBuffer;
  } else if (state === State.TAG_OPEN) {
    output += "<";
  } else if (
    state === State.TAG_NAME || state === State.ATTR_SPACE ||
    state === State.ATTR_NAME ||
    state === State.ATTR_VALUE_START || state === State.ATTR_VALUE
  ) {
    // Unclosed tag - discard it
  } else if (state === State.CLOSE_TAG_NAME) {
    // Unclosed closing tag - discard it
  }

  return { text: output, entities };
}

/**
 * Handles an opening tag by pushing to the tag stack
 */
function handleOpenTag(
  tag: string,
  attrs: Record<string, string>,
  offset: number,
  tagStack: TagStackEntry[],
): void {
  let entityType = TAG_TO_ENTITY_TYPE[tag];

  // Handle special cases
  if (tag === "span") {
    if (attrs["class"] === "tg-spoiler") {
      entityType = "spoiler";
    } else {
      return; // Unsupported span, ignore
    }
  }

  if (tag === "blockquote" && "expandable" in attrs) {
    entityType = "expandable_blockquote";
  }

  if (!entityType) {
    return; // Unsupported tag
  }

  // Handle <pre><code class="language-xxx"> pattern
  // When we see a <code> inside a <pre>, update the pre's language
  if (tag === "code" && tagStack.length > 0) {
    const lastTag = tagStack[tagStack.length - 1];
    if (lastTag.tag === "pre" && attrs["class"]?.startsWith("language-")) {
      lastTag.attrs["language"] = attrs["class"].slice(9);
      // Push code tag so it can be closed, but it won't create a separate entity
      tagStack.push({ tag, entityType, offset, attrs: { insidePre: "true" } });
      return;
    }
  }

  tagStack.push({ tag, entityType, offset, attrs });
}

/**
 * Handles a closing tag by popping from the tag stack and creating an entity
 */
function handleCloseTag(
  tag: string,
  offset: number,
  tagStack: TagStackEntry[],
  entities: MessageEntity[],
): void {
  // Find matching opening tag (search from end)
  let matchIndex = -1;
  for (let i = tagStack.length - 1; i >= 0; i--) {
    if (tagStack[i].tag === tag) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex === -1) {
    return; // No matching opening tag
  }

  const entry = tagStack.splice(matchIndex, 1)[0];
  const length = offset - entry.offset;

  // Skip code tags that are inside pre
  if (entry.attrs["insidePre"]) {
    return;
  }

  // Don't create empty entities
  if (length <= 0) {
    return;
  }

  // Build the entity
  const entity: MessageEntity = {
    type: entry.entityType,
    offset: entry.offset,
    length,
  } as MessageEntity;

  // Add type-specific properties
  if (entry.entityType === "text_link" && entry.attrs["href"]) {
    (entity as MessageEntity & { url: string }).url = entry.attrs["href"];
  } else if (entry.entityType === "pre" && entry.attrs["language"]) {
    (entity as MessageEntity & { language: string }).language =
      entry.attrs["language"];
  } else if (entry.entityType === "custom_emoji" && entry.attrs["emoji-id"]) {
    (entity as MessageEntity & { custom_emoji_id: string }).custom_emoji_id =
      entry.attrs["emoji-id"];
  }

  entities.push(entity);
}
