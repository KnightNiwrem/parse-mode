import type { MessageEntity } from "./deps.deno.ts";
import { FormattedString } from "./format.ts";

const supportedEntities = ["amp", "lt", "gt", "quot"];
const supportedTags = [
  "b", "strong",
  "i", "em",
  "u", "ins",
  "s", "strike", "del",
  "span", "tg-spoiler",
  "a",
  "tg-emoji",
  "code",
  "pre",
  "blockquote",
];
const supportedTagsSet: Set<string> = new Set(supportedTags);
const supportedBareAttributes = ["expandable"];
const supportedBareAttributesSet = new Set(supportedBareAttributes);
const supportedValuedAttributes = ["class", "href", "emoji-id"];
const supportedValuedAttributesSet = new Set(supportedValuedAttributes);
const supportedAttributes = [
  ...supportedBareAttributes,
  ...supportedValuedAttributes,
];

const maxCharCode = 65535;

const HTML_STREAM_PARSER_MODE = {
  TEXT: "TEXT",
  TAG_OPEN: "TAG_OPEN",
  OPEN_TAG_NAME: "OPEN_TAG_NAME",
  CLOSE_TAG_NAME: "CLOSE_TAG_NAME",
  ATTR_NAME: "ATTR_NAME",
  ATTR_VALUE: "ATTR_VALUE",
  ATTR_INVALID: "ATTR_INVALID",
  ENTITY_START: "ENTITY_START",
  ENTITY_NUMERIC_START: "ENTITY_NUMERIC_START",
  ENTITY_HEX_START: "ENTITY_HEX_START",
} as const;

type HTMLTagDraft = {
  name: string;
  isClosing: boolean;
  offset: number;
  originalText: string;
  attrs: Map<string, string>;
};

/**
 * Parses a stream of HTML-style Telegram Bot API characters and generates a FormattedString.
 * @see https://core.telegram.org/bots/api#html-style
 */
export class HTMLStreamParser {
  private mode: keyof typeof HTML_STREAM_PARSER_MODE = HTML_STREAM_PARSER_MODE.TEXT;

  private text: string = "";
  private entities: MessageEntity[] = [];

  private fallbackBufferText: string = "";
  private workingBufferText: string = "";
  private attributeValueQuoteChar: string | undefined = undefined;

  private workingTag: HTMLTagDraft | undefined = undefined;
  private tagStacks: Map<string, HTMLTagDraft[]> = new Map(supportedTags.map((tag) => [tag, []]));

  /**
   * Creates a new HTMLStreamParser instance.
   */
  constructor() {}

  private addCharInAttributeInvalidMode(char: string): void {
    if (!this.workingTag) {
      throw new Error("No working tag in ATTR_INVALID mode");
    }

    this.workingTag.originalText += char;
    if (char === ">") {
      const tagStack = this.tagStacks.get(this.workingTag.name);
      tagStack?.push(this.workingTag);

      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.TEXT;
      return;
    }
    if (char.trim() === "") {
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.ATTR_NAME;
      return;
    }
  }

  private addCharInAttributeNameMode(char: string): void {
    if (!this.workingTag) {
      throw new Error("No working tag in ATTR_NAME mode");
    }

    if (char === ">") {
      const attrName = this.workingBufferText;
      this.workingTag.originalText += `${this.fallbackBufferText}${char}`;
      if (supportedBareAttributesSet.has(attrName)) {
        const attrValue = this.workingTag.attrs.get(attrName) ?? "true";
        this.workingTag.attrs.set(attrName, attrValue);
      }

      const tagStack = this.tagStacks.get(this.workingTag.name);
      tagStack?.push(this.workingTag);
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.TEXT;
      return;
    }

    const isWhitespace = char.trim() === "";
    if (isWhitespace && this.workingBufferText !== "") {
      const attrName = this.workingBufferText;
      this.workingTag.originalText += `${this.fallbackBufferText}${char}`;
      if (supportedBareAttributesSet.has(attrName)) {
        const attrValue = this.workingTag.attrs.get(attrName) ?? "true";
        this.workingTag.attrs.set(attrName, attrValue);
      }
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      return;
    }

    if (char === "=" && this.workingBufferText !== "") {
      const attrName = this.workingBufferText;
      this.workingTag.originalText += `${this.fallbackBufferText}${char}`;
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      if (supportedValuedAttributesSet.has(attrName)) {
        this.mode = HTML_STREAM_PARSER_MODE.ATTR_VALUE;
      } else {
        this.mode = HTML_STREAM_PARSER_MODE.ATTR_INVALID;
      }
      return;
    }

    this.fallbackBufferText += char;
    if (isWhitespace && this.workingBufferText === "") {
      return;
    }

    // We maintain an invariant for this state where workingBufferText
    // is either empty or is a substring of a supported attribute
    // For this case, this doesn't mean we have a valid attribute yet
    // when we encounter '=' or '>' or whitespace next, but we can early-exit when we know we won't have one
    this.workingBufferText += char.toLowerCase();
    if (!supportedAttributes.some((attr) => attr.startsWith(this.workingBufferText))) {
      this.workingTag.originalText += this.fallbackBufferText;
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.ATTR_INVALID;
      return;
    }
  }

  private addCharInAttributeValueMode(char: string): void {
    if (!this.workingTag) {
      throw new Error("No working tag in ATTR_VALUE mode");
    }

    const isWhitespace = char.trim() === "";
    if (this.workingBufferText === "") {
      if (isWhitespace) {
        this.fallbackBufferText += char;
        return;
      }
      if (char === '"' || char === "'") {
        this.attributeValueQuoteChar = char;
        this.fallbackBufferText += char;
        return;
      }
    }

    if (char === this.attributeValueQuoteChar) {
      const attrValue = this.workingBufferText;
      const attrName = Array.from(this.workingTag.attrs.keys()).pop()!; // wrong
      this.workingTag.attrs.set(attrName, attrValue);
      this.workingTag.originalText += `${this.fallbackBufferText}${char}`;
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.attributeValueQuoteChar = undefined;
      this.mode = HTML_STREAM_PARSER_MODE.ATTR_NAME;
      return;
    }
  }

  private addCharInCloseTagNameMode(char: string): void {
    if (char === ">") {
      const tagName = this.workingBufferText;
      const isSupportedTag = supportedTagsSet.has(tagName);
      if (isSupportedTag) {
        const workingTag = this.tagStacks.get(tagName)?.pop();
        if (!workingTag) {
          // No matching opening tag, treat as text
          this.text += `${this.fallbackBufferText}${char}`;
        } else {
          this.entities.push({
            type: workingTag.name, // Need to handle mapping blockquote with expandable attribute to correct entity type
            offset: workingTag.offset,
            length: this.text.length - workingTag.offset,
          });
        }
      } else {
        this.text += `${this.fallbackBufferText}${char}`;
      }

      // We always return to TEXT mode after closing tag
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.TEXT;
      return;
    }

    // We maintain an invariant for this state where workingBufferText
    // is either empty or is a substring of a supported tag
    // For this case, this doesn't mean we have a valid tag yet
    // when we encounter '>' next, but we can early-exit when we know we won't have one
    this.fallbackBufferText += char;
    this.workingBufferText += char.toLowerCase();
    if (!supportedTags.some((tag) => tag.startsWith(this.workingBufferText))) {
      this.text += this.fallbackBufferText;
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.TEXT;
      return;
    }
  }

  private addCharInEntityStartMode(char: string): void {
    if (char === "#" && this.workingBufferText === "") {
      this.fallbackBufferText += char;
      this.mode = HTML_STREAM_PARSER_MODE.ENTITY_NUMERIC_START;
      return;
    }
    if (char === ";") {
      switch (this.workingBufferText) {
        case "amp":
          this.text += "&";
          break;
        case "lt":
          this.text += "<";
          break;
        case "gt":
          this.text += ">";
          break;
        case "quot":
          this.text += '"';
          break;
        default:
          this.text += `${this.fallbackBufferText}${char}`;
      }
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.TEXT;
      return;
    }

    // We maintain an invariant for this state where workingBufferText
    // is either empty or is a substring of a supported entity
    // For this case, this doesn't mean we have a valid entity yet
    // when we encounter ';' next, but we can early-exit when we know we won't have one
    this.fallbackBufferText += char;
    this.workingBufferText += char;
    if (!supportedEntities.some((entity) => entity.startsWith(this.workingBufferText))) {
      this.text += this.fallbackBufferText;
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.TEXT;
      return;
    }
  }

  private addCharInEntityNumericStartMode(char: string): void {
    if (char.toLowerCase() === "x" && this.workingBufferText === "") {
      this.fallbackBufferText += char;
      this.mode = HTML_STREAM_PARSER_MODE.ENTITY_HEX_START;
      return;
    }
    if (char === ";" && this.workingBufferText !== "") {
      const charCode = Number(this.workingBufferText);
      this.text += String.fromCharCode(charCode);
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.TEXT;
      return;
    }

    // We maintain an invariant for this state where workingBufferText
    // is either empty or is a valid charCode decimal string
    this.fallbackBufferText += char;
    this.workingBufferText += char;
    const charCodeOrNaN = Number(this.workingBufferText);
    if (isNaN(charCodeOrNaN) || charCodeOrNaN > maxCharCode) {
      this.text += this.fallbackBufferText;
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.TEXT;
      return;
    }
  }

  private addCharInEntityHexStartMode(char: string): void {
    if (char === ";" && this.workingBufferText !== "") {
      const charCode = Number(`0x${this.workingBufferText}`);
      this.text += String.fromCharCode(charCode);
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.TEXT;
      return;
    }

    // We maintain an invariant for this state where workingBufferText
    // is either empty or is a valid charCode hexadecimal string
    this.fallbackBufferText += char;
    this.workingBufferText += char;
    const charCodeOrNaN = Number(`0x${this.workingBufferText}`);
    if (isNaN(charCodeOrNaN) || charCodeOrNaN > maxCharCode) {
      this.text += this.fallbackBufferText;
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.TEXT;
      return;
    }
  }

  private addCharInOpenTagNameMode(char: string): void {
    const isWhitespace = char.trim() === "";
    if ((char === ">" || isWhitespace) && this.workingBufferText !== "") {
      const tagName = this.workingBufferText;
      const isSupportedTag = supportedTagsSet.has(tagName);
      if (isSupportedTag) {
        this.workingTag = {
          name: tagName,
          isClosing: false,
          offset: this.text.length,
          originalText: `${this.fallbackBufferText}${char}`,
          attrs: new Map<string, string>(),
        };
      } else {
        this.text += `${this.fallbackBufferText}${char}`;
      }

      // We return to TEXT mode if not supported tag or char is '>'
      if (!isSupportedTag || char === ">") {
        this.fallbackBufferText = "";
        this.workingBufferText = "";
        this.mode = HTML_STREAM_PARSER_MODE.TEXT;
        return;
      }

      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.ATTR_NAME;
      return;
    }

    // We maintain an invariant for this state where workingBufferText
    // is either empty or is a substring of a supported tag
    // For this case, this doesn't mean we have a valid tag yet
    // when we encounter '>' or whitespace next, but we can early-exit when we know we won't have one
    this.fallbackBufferText += char;
    this.workingBufferText += char.toLowerCase();
    if (!supportedTags.some((tag) => tag.startsWith(this.workingBufferText))) {
      this.text += this.fallbackBufferText;
      this.fallbackBufferText = "";
      this.workingBufferText = "";
      this.mode = HTML_STREAM_PARSER_MODE.TEXT;
      return;
    }
  }

  private addCharInTagOpenMode(char: string): void {
    const isWhitespace = char.trim() === "";
    const isClosingTagChar = char === "/";

    this.fallbackBufferText += char;
    if (isWhitespace) {
      return;
    }
    if (isClosingTagChar) {
      this.mode = HTML_STREAM_PARSER_MODE.CLOSE_TAG_NAME;
      return;
    }

    // If neither whitespace nor closing tag char, then we
    // assume it is an open tag and pass char to open tag working buffer
    this.workingBufferText += char.toLowerCase();
    this.mode = HTML_STREAM_PARSER_MODE.OPEN_TAG_NAME;
  }

  private addCharInTextMode(char: string): void {
    if (char === "<") {
      this.fallbackBufferText = char;
      this.mode = HTML_STREAM_PARSER_MODE.TAG_OPEN;
    } else if (char === "&") {
      this.fallbackBufferText = char;
      this.mode = HTML_STREAM_PARSER_MODE.ENTITY_START;
    } else {
      this.text += char;
    }
  }

  /**
   * Add a chunk of HTML text to the parser.
   *
   * @param text - A string containing HTML-formatted text
   */
  add(text: string): void {
    for (const char of text) {
      switch (this.mode) {
        case HTML_STREAM_PARSER_MODE.ATTR_NAME:
          this.addCharInAttributeNameMode(char);
          break;
        case HTML_STREAM_PARSER_MODE.ATTR_VALUE:
          this.addCharInAttributeValueMode(char);
          break;
        case HTML_STREAM_PARSER_MODE.ATTR_INVALID:
          this.addCharInAttributeInvalidMode(char);
          break;
        case HTML_STREAM_PARSER_MODE.CLOSE_TAG_NAME:
          this.addCharInCloseTagNameMode(char);
          break;
        case HTML_STREAM_PARSER_MODE.ENTITY_START:
          this.addCharInEntityStartMode(char);
          break;
        case HTML_STREAM_PARSER_MODE.ENTITY_NUMERIC_START:
          this.addCharInEntityNumericStartMode(char);
          break;
        case HTML_STREAM_PARSER_MODE.ENTITY_HEX_START:
          this.addCharInEntityHexStartMode(char);
          break;
        case HTML_STREAM_PARSER_MODE.OPEN_TAG_NAME:
          this.addCharInOpenTagNameMode(char);
          break;
        case HTML_STREAM_PARSER_MODE.TAG_OPEN:
          this.addCharInTagOpenMode(char);
          break;
        case HTML_STREAM_PARSER_MODE.TEXT:
          this.addCharInTextMode(char);
          break;
        default:
          throw new Error(`Unhandled mode: ${this.mode}`);
      }
    }
  }
}

const p = new HTMLStreamParser();
p.add('<blockquote   expandble expandable epand>This is an expandable blockquote &amp; test.</blockquote>');

//@ts-expect-error
console.log(p.text);
//@ts-expect-error
console.log(p.tagStacks);
//@ts-expect-error
console.log(p.entities);

