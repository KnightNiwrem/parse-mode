import {
  a,
  b,
  blockquote,
  code,
  emoji,
  EntityTag,
  expandableBlockquote,
  i,
  pre,
  s,
  spoiler,
  u,
} from "./entity-tag.ts";

/**
 * Parser states for the finite state machine
 */
const enum State {
  /** Normal text parsing */
  TEXT,
  /** After seeing '&', parsing entity name */
  ENTITY,
  /** After seeing '<', waiting to determine tag type */
  TAG_OPEN,
  /** Parsing tag name and attributes */
  TAG_CONTENT,
}

/** Supported HTML entity mappings */
const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
};

/**
 * Parses tag attributes from a space-separated string.
 * Handles: name="value", name='value', name=value, and boolean attributes.
 * @param attrString The attribute string after the tag name
 * @returns Record of attribute name to value
 */
function parseAttributes(attrString: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  let remaining = attrString.trim();

  while (remaining.length > 0) {
    // Find attribute name (ends at '=' or whitespace)
    const nameEnd = remaining.search(/[=\s]/);
    if (nameEnd === -1) {
      // Boolean attribute at end
      attributes[remaining] = "";
      break;
    }

    const attrName = remaining.slice(0, nameEnd);
    remaining = remaining.slice(nameEnd).trimStart();

    if (!remaining.startsWith("=")) {
      // Boolean attribute
      attributes[attrName] = "";
      continue;
    }

    // Skip '='
    remaining = remaining.slice(1).trimStart();

    let value: string;
    if (remaining.startsWith('"')) {
      // Double-quoted value
      const endQuote = remaining.indexOf('"', 1);
      if (endQuote === -1) {
        value = remaining.slice(1);
        remaining = "";
      } else {
        value = remaining.slice(1, endQuote);
        remaining = remaining.slice(endQuote + 1).trimStart();
      }
    } else if (remaining.startsWith("'")) {
      // Single-quoted value
      const endQuote = remaining.indexOf("'", 1);
      if (endQuote === -1) {
        value = remaining.slice(1);
        remaining = "";
      } else {
        value = remaining.slice(1, endQuote);
        remaining = remaining.slice(endQuote + 1).trimStart();
      }
    } else {
      // Unquoted value (ends at whitespace)
      const valueEnd = remaining.search(/\s/);
      if (valueEnd === -1) {
        value = remaining;
        remaining = "";
      } else {
        value = remaining.slice(0, valueEnd);
        remaining = remaining.slice(valueEnd).trimStart();
      }
    }

    attributes[attrName] = value;
  }

  return attributes;
}

/**
 * Converts a tag name and attributes to EntityTag(s).
 * @param tagName The HTML tag name (may include leading '/')
 * @param attributes The tag attributes
 * @returns Array of EntityTags, or undefined if the tag is not supported
 */
function tagToEntityTags(
  tagName: string,
  attributes: Record<string, string>,
): EntityTag[] | undefined {
  const lowerTagName = tagName.toLowerCase();

  switch (lowerTagName) {
    // Bold
    case "b":
    case "/b":
    case "strong":
    case "/strong":
      return [b()];

    // Italic
    case "i":
    case "/i":
    case "em":
    case "/em":
      return [i()];

    // Underline
    case "u":
    case "/u":
    case "ins":
    case "/ins":
      return [u()];

    // Strikethrough
    case "s":
    case "/s":
    case "strike":
    case "/strike":
    case "del":
    case "/del":
      return [s()];

    // Spoiler
    case "tg-spoiler":
    case "/tg-spoiler":
      return [spoiler()];
    case "span":
      // Only span with class="tg-spoiler" is valid
      if (attributes["class"] === "tg-spoiler") {
        return [spoiler()];
      }
      return undefined;
    case "/span":
      // Closing span always matches spoiler (if there was an opening tg-spoiler span)
      return [spoiler()];

    // Links
    case "a":
      if (attributes["href"]) {
        return [a(attributes["href"])];
      }
      return undefined;
    case "/a":
      return [a("")];

    // Custom emoji
    case "tg-emoji":
      if (attributes["emoji-id"]) {
        return [emoji(attributes["emoji-id"])];
      }
      return undefined;
    case "/tg-emoji":
      return [emoji("")];

    // Code
    case "code":
    case "/code":
      return [code()];

    // Pre (code block)
    case "pre":
      return [pre(attributes["language"])];
    case "/pre":
      return [pre()];

    // Blockquote
    case "blockquote":
      // Check for expandable attribute
      if ("expandable" in attributes) {
        return [expandableBlockquote()];
      }
      return [blockquote()];
    case "/blockquote":
      // Closing tag could match either blockquote type - emit both
      return [expandableBlockquote(), blockquote()];

    default:
      return undefined;
  }
}

/**
 * Parses HTML string into text parts and entity tags suitable for fmt.
 * Uses a character-by-character finite state machine parser.
 *
 * @param html The HTML string to parse
 * @returns Object containing interleaved text parts and entity tags
 */
export function parseHtml(html: string): {
  textParts: string[];
  entityTagParts: EntityTag[];
} {
  let state = State.TEXT;
  let textBuffer = "";
  let entityBuffer = "";
  let tagBuffer = "";

  const textParts: string[] = [];
  const entityTagParts: EntityTag[] = [];

  for (const char of html) {
    switch (state) {
      case State.TEXT:
        if (char === "<") {
          state = State.TAG_OPEN;
        } else if (char === "&") {
          state = State.ENTITY;
        } else {
          textBuffer += char;
        }
        break;

      case State.ENTITY:
        if (char === ";") {
          // End of entity reference
          const decoded = HTML_ENTITIES[entityBuffer];
          if (decoded !== undefined) {
            textBuffer += decoded;
          } else if (entityBuffer.startsWith("#x")) {
            // Hex numeric entity: &#xHHHH;
            const codePoint = parseInt(entityBuffer.slice(2), 16);
            if (!isNaN(codePoint)) {
              textBuffer += String.fromCodePoint(codePoint);
            } else {
              textBuffer += `&${entityBuffer};`;
            }
          } else if (entityBuffer.startsWith("#")) {
            // Decimal numeric entity: &#NNNN;
            const codePoint = parseInt(entityBuffer.slice(1), 10);
            if (!isNaN(codePoint)) {
              textBuffer += String.fromCodePoint(codePoint);
            } else {
              textBuffer += `&${entityBuffer};`;
            }
          } else {
            // Unknown entity, keep as-is
            textBuffer += `&${entityBuffer};`;
          }
          entityBuffer = "";
          state = State.TEXT;
        } else if (char === "&") {
          // New entity starts, flush previous incomplete entity
          textBuffer += `&${entityBuffer}`;
          entityBuffer = "";
        } else if (char === "<") {
          // Tag starts, flush incomplete entity
          textBuffer += `&${entityBuffer}`;
          entityBuffer = "";
          state = State.TAG_OPEN;
        } else {
          entityBuffer += char;
        }
        break;

      case State.TAG_OPEN:
        if (char === "<") {
          // Another '<', first one was literal
          textBuffer += "<";
        } else if (char === ">") {
          // Empty tag "<>", treat as literal
          textBuffer += "<>";
          state = State.TEXT;
        } else {
          // Start building tag content
          tagBuffer = char;
          state = State.TAG_CONTENT;
        }
        break;

      case State.TAG_CONTENT:
        if (char === ">") {
          // End of tag, process it
          const spaceIndex = tagBuffer.search(/\s/);
          let tagName: string;
          let attrString: string;

          if (spaceIndex === -1) {
            tagName = tagBuffer;
            attrString = "";
          } else {
            tagName = tagBuffer.slice(0, spaceIndex);
            attrString = tagBuffer.slice(spaceIndex + 1);
          }

          const attributes = parseAttributes(attrString);
          const entityTags = tagToEntityTags(tagName, attributes);

          if (entityTags !== undefined && entityTags.length > 0) {
            // Valid tag, flush text buffer and add entities
            textParts.push(textBuffer);
            textBuffer = "";
            // Add all entity tags, with empty strings between them
            for (let i = 0; i < entityTags.length; i++) {
              entityTagParts.push(entityTags[i]);
              if (i < entityTags.length - 1) {
                textParts.push("");
              }
            }
          } else {
            // Unknown tag, treat as literal text
            textBuffer += `<${tagBuffer}>`;
          }

          tagBuffer = "";
          state = State.TEXT;
        } else if (char === "<") {
          // Malformed: new tag starts before current one closed
          // Treat previous '<' + buffer as literal
          textBuffer += `<${tagBuffer}`;
          tagBuffer = "";
          state = State.TAG_OPEN;
        } else {
          tagBuffer += char;
        }
        break;
    }
  }

  // Handle remaining buffers based on final state
  switch (state) {
    case State.ENTITY:
      textBuffer += `&${entityBuffer}`;
      break;
    case State.TAG_OPEN:
      textBuffer += "<";
      break;
    case State.TAG_CONTENT:
      textBuffer += `<${tagBuffer}`;
      break;
  }

  // Push final text buffer if non-empty
  if (textBuffer.length > 0) {
    textParts.push(textBuffer);
  }

  // Ensure textParts has one more element than entityTagParts for fmt compatibility
  // fmt expects: textParts[0] + entityTag[0] + textParts[1] + entityTag[1] + ... + textParts[n]
  if (textParts.length === entityTagParts.length && entityTagParts.length > 0) {
    textParts.push("");
  }

  return { textParts, entityTagParts };
}
