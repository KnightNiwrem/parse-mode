import type { MessageEntity } from "./deps.deno.ts";
import { FormattedString } from "./format.ts";
import { copyMessageEntity, sortEntities } from "./util.ts";

// ---------------------------------------------------------------------------
// Supported syntax
// ---------------------------------------------------------------------------

export const supportedEntities = ["amp", "lt", "gt", "quot"];
export const supportedTags = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ins",
  "s",
  "strike",
  "del",
  "span",
  "tg-spoiler",
  "a",
  "tg-emoji",
  "code",
  "pre",
  "blockquote",
  "tg-time",
];
export const supportedTagsSet: Set<string> = new Set(supportedTags);

export const supportedBareAttributes = ["expandable"];
export const supportedBareAttributesSet = new Set(supportedBareAttributes);
export const supportedValuedAttributes = [
  "class",
  "href",
  "emoji-id",
  "unix",
  "format",
];
export const supportedValuedAttributesSet = new Set(supportedValuedAttributes);
export const supportedAttributes = [
  ...supportedBareAttributes,
  ...supportedValuedAttributes,
];

export const tagsToRequiredAttributes = new Map<string, string[]>([
  ["a", ["href"]],
  ["span", ["class"]],
  ["tg-emoji", ["emoji-id"]],
  ["tg-time", ["unix"]],
]);

export const languageClassPrefix = "language-";
export const spoilerClassName = "tg-spoiler";
export const maxCodePoint = 0x10ffff;

const namedReferences = new Map<string, string>([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
]);

export function isWhitespace(char: string): boolean {
  return char.trim() === "";
}

export function isSupportedTagPrefix(prefix: string): boolean {
  return supportedTags.some((tag) => tag.startsWith(prefix));
}

export function isSupportedAttributePrefix(prefix: string): boolean {
  return supportedAttributes.some((attr) => attr.startsWith(prefix));
}

export function isSupportedEntityPrefix(prefix: string): boolean {
  return supportedEntities.some((entity) => entity.startsWith(prefix));
}

export function isAlphabet(char: string): boolean {
  return (char >= "a" && char <= "z") ||
    (char >= "A" && char <= "Z");
}

export function isDecimalDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

export function isHexDigit(char: string): boolean {
  return isDecimalDigit(char) ||
    (char >= "a" && char <= "f") ||
    (char >= "A" && char <= "F");
}

/** Whether `codePoint` is a Unicode scalar value (0 to U+10FFFF, no surrogates). */
export function isValidCodePoint(codePoint: number): boolean {
  return (
    Number.isInteger(codePoint) &&
    codePoint >= 0 &&
    codePoint <= maxCodePoint &&
    !(codePoint >= 0xd800 && codePoint <= 0xdfff)
  );
}

/**
 * Whether a numeric character reference such as `&#65;` decodes to
 * `codePoint`. Like Telegram, this excludes 0 and U+10FFFF on top of the
 * values rejected by {@link isValidCodePoint}.
 */
export function isDecodableCodePoint(codePoint: number): boolean {
  return isValidCodePoint(codePoint) && codePoint > 0 &&
    codePoint < maxCodePoint;
}

/** Characters allowed in an attribute name. */
function isAttrNameChar(char: string): boolean {
  return !isWhitespace(char) && !"=>/\"'".includes(char);
}

/** Characters that make an unquoted attribute value malformed. */
function isForbiddenInUnquotedValue(char: string): boolean {
  return "\"'<=`".includes(char);
}

/** Splits a `class` attribute value into its whitespace-separated tokens. */
function classTokens(value: string | undefined): string[] {
  const tokens: string[] = [];
  let token = "";
  for (const char of value ?? "") {
    if (!isWhitespace(char)) {
      token += char;
    } else if (token !== "") {
      tokens.push(token);
      token = "";
    }
  }
  if (token !== "") {
    tokens.push(token);
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Stage 1: tokenizer
//
// A character-at-a-time state machine whose state names follow the HTML5
// tokenizer. It recognises syntax only and hands tokens to the builder. While
// a tag or character reference is unfinished, its raw source is kept in
// `pending` so that it can still be released as literal text.
//
// Every state can make three moves:
// - emit: the construct is complete; hand a token over, clear `pending`,
//   return to Data.
// - bail: this was not a tag after all; hand `pending` over as text, then
//   reconsume the current character in Data. This is the plaintext fallback.
// - reconsume: switch state and process the same character again there.
// ---------------------------------------------------------------------------

type Token =
  | { type: "Text"; text: string }
  | {
    type: "StartTag";
    name: string;
    attrs: Map<string, string>;
    raw: string;
  }
  | { type: "EndTag"; name: string; raw: string };

type State =
  | "Data"
  | "TagOpen"
  | "TagName"
  | "EndTagName"
  | "AfterEndTagName"
  | "BeforeAttrName"
  | "AttrName"
  | "AfterAttrName"
  | "BeforeAttrValue"
  | "AttrValueQuoted"
  | "AttrValueUnquoted"
  | "CharRef"
  | "NamedRef"
  | "NumericRef"
  | "DecRef"
  | "HexRef";

/** The states that can start a character reference and get its output. */
type RefReturnState = "Data" | "AttrValueQuoted" | "AttrValueUnquoted";

class Tokenizer {
  /** Raw source of the unfinished tag or reference. Empty in Data. */
  pending = "";
  private state: State = "Data";

  // The tag being read
  private tagName = "";
  private attrs = new Map<string, string>();
  private attrName = "";
  private attrValue = "";
  private quote = "";

  // The character reference being read
  /** Raw source of the reference, starting with `&`. */
  private ref = "";
  private returnState: RefReturnState = "Data";

  constructor(private readonly onToken: (token: Token) => void) {}

  /** Processes one character (one code point, or a lone surrogate). */
  step(char: string): void {
    switch (this.state) {
      case "Data":
        return this.data(char);
      case "TagOpen":
        return this.tagOpen(char);
      case "TagName":
        return this.tagNameState(char);
      case "EndTagName":
        return this.endTagName(char);
      case "AfterEndTagName":
        return this.afterEndTagName(char);
      case "BeforeAttrName":
        return this.beforeAttrName(char);
      case "AttrName":
        return this.attrNameState(char);
      case "AfterAttrName":
        return this.afterAttrName(char);
      case "BeforeAttrValue":
        return this.beforeAttrValue(char);
      case "AttrValueQuoted":
        return this.attrValueQuoted(char);
      case "AttrValueUnquoted":
        return this.attrValueUnquoted(char);
      case "CharRef":
        return this.charRef(char);
      case "NamedRef":
        return this.namedRef(char);
      case "NumericRef":
        return this.numericRef(char);
      case "DecRef":
        return this.decRef(char);
      case "HexRef":
        return this.hexRef(char);
    }
  }

  // --- The three moves -----------------------------------------------------

  private emit(token: Token): void {
    this.onToken(token);
    this.pending = "";
    this.state = "Data";
  }

  private bail(char: string): void {
    this.emit({ type: "Text", text: this.pending });
    this.reconsume("Data", char);
  }

  private reconsume(state: State, char: string): void {
    this.state = state;
    this.step(char);
  }

  // --- Helpers -------------------------------------------------------------

  /** Adds `char` to the pending source and moves to `next`. */
  private consume(char: string, next: State): void {
    this.pending += char;
    this.state = next;
  }

  private emitStartTag(gt: string): void {
    this.pending += gt;
    this.emit({
      type: "StartTag",
      name: this.tagName,
      attrs: this.attrs,
      raw: this.pending,
    });
  }

  private emitEndTag(gt: string): void {
    this.pending += gt;
    this.emit({ type: "EndTag", name: this.tagName, raw: this.pending });
  }

  /** Extends the tag name, or bails once it can no longer become supported. */
  private extendTagName(char: string, state: State): void {
    const name = this.tagName + char.toLowerCase();
    if (!isSupportedTagPrefix(name)) return this.bail(char);
    this.tagName = name;
    this.consume(char, state);
  }

  /** Stores the current attribute; the first value seen for a name wins. */
  private storeAttr(value: string): void {
    if (!this.attrs.has(this.attrName)) {
      this.attrs.set(this.attrName, value);
    }
    this.attrName = "";
    this.attrValue = "";
  }

  // --- Text and tag names (diagram 1) --------------------------------------

  // Data: lt → TagOpen; amp → CharRef (returning to Data); other → emit Text.
  private data(char: string): void {
    if (char === "<") {
      this.tagName = "";
      this.attrs = new Map();
      this.attrName = "";
      this.attrValue = "";
      this.consume(char, "TagOpen");
    } else if (char === "&") {
      this.startCharRef(char, "Data");
    } else {
      this.emit({ type: "Text", text: char });
    }
  }

  // TagOpen: slash → EndTagName; first letter of a supported tag → TagName;
  // other → bail.
  private tagOpen(char: string): void {
    if (char === "/") return this.consume(char, "EndTagName");
    this.extendTagName(char, "TagName");
  }

  // TagName: still a prefix of a supported tag → TagName. If the name is
  // supported: ws → BeforeAttrName, gt → emit StartTag. Other → bail.
  private tagNameState(char: string): void {
    if (isWhitespace(char) || char === ">") {
      if (!supportedTagsSet.has(this.tagName)) return this.bail(char);
      if (char === ">") return this.emitStartTag(char);
      return this.consume(char, "BeforeAttrName");
    }
    this.extendTagName(char, "TagName");
  }

  // EndTagName: still a prefix of a supported tag → EndTagName. If the name is
  // supported: ws → AfterEndTagName, gt → emit EndTag. Other → bail.
  private endTagName(char: string): void {
    if (isWhitespace(char) || char === ">") {
      if (!supportedTagsSet.has(this.tagName)) return this.bail(char);
      if (char === ">") return this.emitEndTag(char);
      return this.consume(char, "AfterEndTagName");
    }
    this.extendTagName(char, "EndTagName");
  }

  // AfterEndTagName: gt → emit EndTag; anything else is ignored.
  private afterEndTagName(char: string): void {
    if (char === ">") return this.emitEndTag(char);
    this.consume(char, "AfterEndTagName");
  }

  // --- Attributes (diagram 2) ----------------------------------------------

  // BeforeAttrName: ws → BeforeAttrName; gt → emit StartTag;
  // name character → AttrName; other → bail.
  private beforeAttrName(char: string): void {
    if (isWhitespace(char)) return this.consume(char, "BeforeAttrName");
    if (char === ">") return this.emitStartTag(char);
    if (!isAttrNameChar(char)) return this.bail(char);
    this.attrName = char.toLowerCase();
    this.consume(char, "AttrName");
  }

  // AttrName: name character → AttrName; ws → AfterAttrName;
  // eq → BeforeAttrValue; gt → store flag, emit StartTag; other → bail.
  private attrNameState(char: string): void {
    if (isAttrNameChar(char)) {
      this.attrName += char.toLowerCase();
      return this.consume(char, "AttrName");
    }
    if (isWhitespace(char)) return this.consume(char, "AfterAttrName");
    if (char === "=") return this.consume(char, "BeforeAttrValue");
    if (char === ">") {
      this.storeAttr("");
      return this.emitStartTag(char);
    }
    this.bail(char);
  }

  // AfterAttrName: ws → AfterAttrName; eq → BeforeAttrValue;
  // other → store flag, reconsume in BeforeAttrName.
  private afterAttrName(char: string): void {
    if (isWhitespace(char)) return this.consume(char, "AfterAttrName");
    if (char === "=") return this.consume(char, "BeforeAttrValue");
    this.storeAttr("");
    this.reconsume("BeforeAttrName", char);
  }

  // BeforeAttrValue: ws → BeforeAttrValue; quote → AttrValueQuoted;
  // gt → bail (missing value); other → reconsume in AttrValueUnquoted.
  private beforeAttrValue(char: string): void {
    if (isWhitespace(char)) return this.consume(char, "BeforeAttrValue");
    if (char === '"' || char === "'") {
      this.quote = char;
      return this.consume(char, "AttrValueQuoted");
    }
    if (char === ">") return this.bail(char);
    this.reconsume("AttrValueUnquoted", char);
  }

  // AttrValueQuoted: same quote → store attr, BeforeAttrName;
  // amp → CharRef (returning here); other → append.
  private attrValueQuoted(char: string): void {
    if (char === this.quote) {
      this.storeAttr(this.attrValue);
      return this.consume(char, "BeforeAttrName");
    }
    if (char === "&") return this.startCharRef(char, "AttrValueQuoted");
    this.attrValue += char;
    this.consume(char, "AttrValueQuoted");
  }

  // AttrValueUnquoted: ws → store attr, BeforeAttrName;
  // gt → store attr, emit StartTag; amp → CharRef (returning here);
  // quote, lt, eq or backtick → bail; other → append.
  private attrValueUnquoted(char: string): void {
    if (isWhitespace(char)) {
      this.storeAttr(this.attrValue);
      return this.consume(char, "BeforeAttrName");
    }
    if (char === ">") {
      this.storeAttr(this.attrValue);
      return this.emitStartTag(char);
    }
    if (char === "&") return this.startCharRef(char, "AttrValueUnquoted");
    if (isForbiddenInUnquotedValue(char)) return this.bail(char);
    this.attrValue += char;
    this.consume(char, "AttrValueUnquoted");
  }

  // --- Character references (diagram 3) ------------------------------------
  //
  // In every reference state, a character with no transition ends the
  // attempt: the raw characters are output as written and that character is
  // reconsumed in the return state.

  private startCharRef(amp: string, returnState: RefReturnState): void {
    this.ref = amp;
    this.returnState = returnState;
    this.consume(amp, "CharRef");
  }

  /** Adds `char` to the reference and moves to `next`. */
  private consumeRef(char: string, next: State): void {
    this.ref += char;
    this.consume(char, next);
  }

  /** Outputs `text` to the return state: as Text, or into the attr value. */
  private outputRef(text: string): void {
    if (this.returnState === "Data") {
      this.emit({ type: "Text", text });
    } else {
      this.attrValue += text;
      this.state = this.returnState;
    }
  }

  /** The `semi` → check step: output the decoded character or the raw source. */
  private finishRef(semi: string, decoded: string | undefined): void {
    this.consumeRef(semi, this.state);
    this.outputRef(decoded ?? this.ref);
  }

  /** Ends a failed attempt and reconsumes `char` in the return state. */
  private failRef(char: string): void {
    this.outputRef(this.ref);
    this.reconsume(this.returnState, char);
  }

  // CharRef: letter → reconsume in NamedRef; hash → NumericRef; other → fail.
  private charRef(char: string): void {
    if (isAlphabet(char)) return this.reconsume("NamedRef", char);
    if (char === "#") return this.consumeRef(char, "NumericRef");
    this.failRef(char);
  }

  // NamedRef: letter that keeps a prefix of lt/gt/amp/quot → NamedRef;
  // semi → check; other → fail.
  private namedRef(char: string): void {
    const name = this.ref.slice("&".length);
    if (char === ";") return this.finishRef(char, namedReferences.get(name));
    if (isAlphabet(char) && isSupportedEntityPrefix(name + char)) {
      return this.consumeRef(char, "NamedRef");
    }
    this.failRef(char);
  }

  // NumericRef: digit → reconsume in DecRef; x or X → HexRef; other → fail.
  private numericRef(char: string): void {
    if (isDecimalDigit(char)) return this.reconsume("DecRef", char);
    if (char === "x" || char === "X") return this.consumeRef(char, "HexRef");
    this.failRef(char);
  }

  // DecRef: digit → DecRef; semi → check; other → fail.
  private decRef(char: string): void {
    if (isDecimalDigit(char)) return this.consumeRef(char, "DecRef");
    if (char === ";") {
      const digits = this.ref.slice("&#".length);
      return this.finishRef(char, decodeCodePoint(Number(digits)));
    }
    this.failRef(char);
  }

  // HexRef: hex digit → HexRef; semi → check; other → fail.
  private hexRef(char: string): void {
    if (isHexDigit(char)) return this.consumeRef(char, "HexRef");
    if (char === ";") {
      const digits = this.ref.slice("&#x".length);
      // `Number("0x")` is NaN, so `&#x;` stays literal
      return this.finishRef(char, decodeCodePoint(Number(`0x${digits}`)));
    }
    this.failRef(char);
  }
}

function decodeCodePoint(codePoint: number): string | undefined {
  return isDecodableCodePoint(codePoint)
    ? String.fromCodePoint(codePoint)
    : undefined;
}

// ---------------------------------------------------------------------------
// Stage 2: entity builder
//
// Owns the output text, one ordered stack of open elements, and the finished
// entities. All start tag validation and end tag matching happens here.
// ---------------------------------------------------------------------------

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K>
  : never;
/** An entity without its position, decided when its start tag is accepted. */
type EntityTemplate = DistributiveOmit<MessageEntity, "offset" | "length">;

/** The meaning of an accepted start tag. */
interface StartTagMeaning {
  /** The entity to create on close. */
  entity: EntityTemplate;
  /** For `code`: the language to hand to a `pre` over the same range. */
  language?: string;
}

interface OpenElement extends StartTagMeaning {
  name: string;
  /** Text offset where the start tag stood. */
  offset: number;
  /** Raw source of the start tag, restored by the ended snapshot. */
  raw: string;
  /** Source order of the start tag. */
  seq: number;
}

interface FinishedEntity {
  entity: MessageEntity;
  /** Source order of the start tag and the end tag. */
  startSeq: number;
  endSeq: number;
  /** For `code`: the language to hand to a `pre` over the same range. */
  language?: string;
}

/** Decides what a start tag means, or returns undefined to reject it. */
function interpretStartTag(
  name: string,
  attrs: Map<string, string>,
): StartTagMeaning | undefined {
  for (const required of tagsToRequiredAttributes.get(name) ?? []) {
    if (!attrs.has(required)) return undefined;
  }

  switch (name) {
    case "b":
    case "strong":
      return { entity: { type: "bold" } };
    case "i":
    case "em":
      return { entity: { type: "italic" } };
    case "u":
    case "ins":
      return { entity: { type: "underline" } };
    case "s":
    case "strike":
    case "del":
      return { entity: { type: "strikethrough" } };
    case "span":
      return classTokens(attrs.get("class")).indexOf(spoilerClassName) >= 0
        ? { entity: { type: "spoiler" } }
        : undefined;
    case "tg-spoiler":
      return { entity: { type: "spoiler" } };
    case "a": {
      // A bare or empty href is no better than a missing one
      const url = attrs.get("href");
      return url ? { entity: { type: "text_link", url } } : undefined;
    }
    case "tg-emoji": {
      // Bot API types the id as a plain string; Telegram validates it on send
      const id = attrs.get("emoji-id");
      return id
        ? { entity: { type: "custom_emoji", custom_emoji_id: id } }
        : undefined;
    }
    case "code": {
      const language = classTokens(attrs.get("class"))
        .filter((token) => token.length > languageClassPrefix.length)
        .find((token) => token.startsWith(languageClassPrefix))
        ?.slice(languageClassPrefix.length);
      return { entity: { type: "code" }, language };
    }
    case "pre":
      return { entity: { type: "pre" } };
    case "blockquote":
      return {
        entity: {
          type: attrs.has("expandable")
            ? "expandable_blockquote"
            : "blockquote",
        },
      };
    case "tg-time":
      return interpretTimeTag(attrs);
    default:
      return undefined;
  }
}

function interpretTimeTag(
  attrs: Map<string, string>,
): StartTagMeaning | undefined {
  const unix = attrs.get("unix") ?? "";
  if (!/^-?\d+$/.test(unix)) return undefined;
  const unixTime = parseInt(unix, 10);
  if (!Number.isFinite(unixTime)) return undefined;
  const format = attrs.get("format");
  if (format !== undefined && !/^(?:r|w?[dD]?[tT]?)$/.test(format)) {
    return undefined;
  }
  const date_time_format = (format ??
    "") as MessageEntity.DateTimeMessageEntity["date_time_format"];
  return {
    entity: { type: "date_time", unix_time: unixTime, date_time_format },
  };
}

class EntityBuilder {
  private text = "";
  /**
   * One stack of open elements per tag name, so an end tag finds the nearest
   * open element with its name on top. Each stack is in source order.
   */
  private open = new Map<string, OpenElement[]>();
  private finished: FinishedEntity[] = [];
  /** Source order of tag tokens, used to order equal text offsets. */
  private seq = 0;

  accept(token: Token): void {
    switch (token.type) {
      case "Text":
        this.text += token.text;
        return;
      case "StartTag":
        return this.startTag(token.name, token.attrs, token.raw);
      case "EndTag":
        return this.endTag(token.name, token.raw);
    }
  }

  private startTag(
    name: string,
    attrs: Map<string, string>,
    raw: string,
  ): void {
    const seq = this.seq++;
    const meaning = interpretStartTag(name, attrs);
    if (!meaning) {
      this.text += raw;
      return;
    }
    let stack = this.open.get(name);
    if (stack === undefined) this.open.set(name, stack = []);
    stack.push({ ...meaning, name, offset: this.text.length, raw, seq });
  }

  /** Closes the nearest open element with the same name. */
  private endTag(name: string, raw: string): void {
    const seq = this.seq++;
    const element = this.open.get(name)?.pop();
    if (element === undefined) {
      this.text += raw;
      return;
    }

    const length = this.text.length - element.offset;
    // An empty element can only gain text in the ended snapshot, from a start
    // tag put back inside it: one that came after its own and is still open.
    // Snapshots drop what stays empty.
    if (length === 0 && !this.openSince(element.seq)) return;
    this.finished.push({
      entity: {
        ...element.entity,
        offset: element.offset,
        length,
      } as MessageEntity,
      startSeq: element.seq,
      endSeq: seq,
      language: element.language,
    });
  }

  /** Whether a start tag after source order `seq` is still open. */
  private openSince(seq: number): boolean {
    for (const stack of this.open.values()) {
      // The top of a stack is its latest start tag
      if (stack.length > 0 && stack[stack.length - 1].seq > seq) return true;
    }
    return false;
  }

  /**
   * Turns finished entities, in the order their end tags arrived, into the
   * entities of a snapshot. Entities covering no text are dropped. Like
   * Telegram, a `pre` and a `code` with a language that follow each other
   * over exactly the same range become one `pre` with that language, in
   * either nesting order. Otherwise `code` has no language.
   */
  private collect(finished: FinishedEntity[]): MessageEntity[] {
    const kept: FinishedEntity[] = [];
    for (const next of finished) {
      if (next.entity.length === 0) continue;
      const last = kept[kept.length - 1];
      if (
        last !== undefined &&
        last.entity.offset === next.entity.offset &&
        last.entity.length === next.entity.length
      ) {
        const [pre, code] = next.entity.type === "pre"
          ? [next.entity, last]
          : [last.entity, next];
        if (
          pre.type === "pre" && pre.language === undefined &&
          code.entity.type === "code" && code.language !== undefined
        ) {
          kept[kept.length - 1] = {
            ...next,
            entity: { ...pre, language: code.language },
            language: undefined,
          };
          continue;
        }
      }
      kept.push(next);
    }
    return sortEntities(kept.map((f) => copyMessageEntity(f.entity)));
  }

  /** The intermediate snapshot: undecided input and unclosed tags left out. */
  snapshot(): FormattedString {
    return new FormattedString(this.text, this.collect(this.finished));
  }

  /**
   * The snapshot as if the stream ended now: each unclosed start tag is put
   * back as literal text where it stood, and `pending` is appended.
   */
  endedSnapshot(pending: string): FormattedString {
    // Source order is also text offset order
    const open = Array.from(this.open.values()).flat()
      .sort((a, b) => a.seq - b.seq);
    let text = "";
    let copied = 0;
    // The length of the first k restored start tags is at index k
    const restored = [0];
    for (const element of open) {
      text += this.text.slice(copied, element.offset) + element.raw;
      copied = element.offset;
      restored.push(restored[restored.length - 1] + element.raw.length);
    }
    text += this.text.slice(copied) + pending;

    const shift = (offset: number, seq: number) =>
      restored[restoredBefore(open, offset, seq)];
    const finished = this.finished.map((f) => {
      const end = f.entity.offset + f.entity.length;
      const offset = f.entity.offset + shift(f.entity.offset, f.startSeq);
      const length = end + shift(end, f.endSeq) - offset;
      return { ...f, entity: { ...f.entity, offset, length } };
    });
    return new FormattedString(text, this.collect(finished));
  }
}

/**
 * How many of the restored start tags `open`, in source order, land before an
 * entity boundary at text `offset` written by the tag with source order `seq`.
 * A restored tag at the same offset lands before the boundary when it came
 * first in source. Those tags are a prefix of `open`, found by binary search.
 */
function restoredBefore(
  open: OpenElement[],
  offset: number,
  seq: number,
): number {
  let low = 0;
  let high = open.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    const element = open[mid];
    if (
      element.offset < offset ||
      (element.offset === offset && element.seq < seq)
    ) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Options for {@link HTMLStreamParser.toFormattedString}. */
export interface HTMLStreamSnapshotOptions {
  /**
   * Build the result as if the stream ended now. Undecided input (an
   * unfinished tag or character reference) is appended as literal text, and
   * the start tag of every element that is still open is put back as literal
   * text where it stood, without an entity. Defaults to `false`.
   */
  ended?: boolean;
}

/**
 * Parses a stream of HTML-style Telegram Bot API characters and generates a FormattedString.
 *
 * Input may be split into chunks anywhere, including inside tags, attributes
 * and character references. Anything that is not a well-formed supported tag
 * or character reference stays in the output as literal text.
 *
 * @see https://core.telegram.org/bots/api#html-style
 */
export class HTMLStreamParser {
  private builder = new EntityBuilder();
  private tokenizer = new Tokenizer((token) => this.builder.accept(token));

  /**
   * Add a chunk of HTML text to the parser. Chunks may be split anywhere, and
   * more chunks may be added after any call to {@link toFormattedString},
   * with or without the `ended` option.
   *
   * @param text - A string containing HTML-formatted text
   */
  add(text: string): void {
    for (const char of text) {
      this.tokenizer.step(char);
    }
  }

  /**
   * Build and return a FormattedString from the input added so far. This
   * does not change the parser state, and calling it again without adding
   * input gives an equal result.
   *
   * By default the result is intermediate: an unfinished tag or character
   * reference at the end of the input is left out, and so are the start
   * tags of elements that are still open (their content is kept, without an
   * entity). Pass `{ ended: true }` to get the result as if the stream ended
   * now: the unfinished input and the start tags of still-open elements are
   * kept as literal text instead.
   *
   * Entities are returned sorted.
   *
   * @param options - Pass `{ ended: true }` for the as-if-ended result
   * @returns A new FormattedString instance containing the parsed text and entities
   */
  toFormattedString(options: HTMLStreamSnapshotOptions = {}): FormattedString {
    return options.ended
      ? this.builder.endedSnapshot(this.tokenizer.pending)
      : this.builder.snapshot();
  }
}
