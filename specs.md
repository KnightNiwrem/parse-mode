# HTMLStreamParser Refactor Specification

## Scope

This document defines completion criteria for refactoring `src/stream-html-to-format.ts` from the current incomplete implementation on `feat/html-stream-parser`.

This is a spec-only task. No production code or tests are implemented in this document.

## Primary Goal

Implement a streaming, character-by-character HTML parser for Telegram parse mode that:

1. Accepts input incrementally via repeated `add()` calls.
2. Produces a `FormattedString` via `toFormattedString()`.
3. Recovers safely from malformed/incomplete input by emitting literal text.
4. Preserves the current implementation approach (state machine + buffers), while completing missing behavior.

## Hard Implementation Constraints

1. Keep a manual state machine parser (no DOM parser).
2. Reuse the current buffer-driven strategy (or direct equivalent):
   - `fallbackBufferText`
   - `workingBufferText`
   - `attributeNameBufferText`
   - `attributeValueBufferText`
   - `attributeValueQuoteChar`
3. Validate numeric/hex entities with `Number(...)` (as in current implementation), not regex.
4. Avoid regex for core parsing/validation wherever possible.
5. No module side effects in parser module (remove any debug/demo code at module bottom).

## Public API Contract

### `class HTMLStreamParser`

#### `add(text: string): void`

Adds one chunk to parser state. Must support arbitrary chunk boundaries (including splitting inside tags/entities/attributes).

#### `toFormattedString(): FormattedString`

Returns current parsed result as `FormattedString`.

Behavioral requirements:

1. Idempotent when state is unchanged.
2. Must finalize partial parser state safely for output (see EOF finalization rules).
3. Must not duplicate entities or mutate prior results unexpectedly across repeated calls.

## Supported HTML Entity Parsing

### Named entities

Supported named entities:

1. `&amp;` -> `&`
2. `&lt;` -> `<`
3. `&gt;` -> `>`
4. `&quot;` -> `"`

Anything else remains literal text.

### Numeric entities

1. Decimal: `&#1234;`
2. Hex: `&#x1f4a9;` or `&#X1F4A9;`
3. Semicolon is required to finalize entity.
4. Use `Number(...)` validation.
5. Maximum supported char code: `65535` (BMP), consistent with current `String.fromCharCode(...)` approach.
6. If invalid (`NaN`, out of range, malformed), emit original literal text collected in buffers.

## Supported Tags and Attributes

### Supported tag names

1. `b`, `strong`
2. `i`, `em`
3. `u`, `ins`
4. `s`, `strike`, `del`
5. `span`, `tg-spoiler`
6. `a`
7. `tg-emoji`
8. `code`
9. `pre`
10. `blockquote`

### Supported attributes

1. Bare attributes: `expandable`
2. Valued attributes: `class`, `href`, `emoji-id`

### Required attributes by tag

1. `a` requires `href`
2. `span` requires `class`
3. `tg-emoji` requires `emoji-id`

If required attributes are missing, the opening tag is treated as plain text.

## Entity Type Mapping Rules

When a valid opening tag is matched by a valid closing tag, produce these entities:

1. `b`/`strong` -> `bold`
2. `i`/`em` -> `italic`
3. `u`/`ins` -> `underline`
4. `s`/`strike`/`del` -> `strikethrough`
5. `a[href]` -> `text_link` with `url = href`
6. `tg-emoji[emoji-id]` -> `custom_emoji` with `custom_emoji_id = emoji-id`
7. `tg-spoiler` -> `spoiler`
8. `span[class="tg-spoiler"]` -> `spoiler`
9. `blockquote[expandable]` -> `expandable_blockquote`
10. `blockquote` without `expandable` -> `blockquote`
11. `code` -> `code` (except special `pre + code[class=language-...]` rule)
12. `pre` -> `pre` (with optional `language`)

## Special `pre` + `code` Language Rule

Telegram HTML syntax supports:

```html
<pre><code class="language-python">...</code></pre>
```

Required behavior:

1. Result must be one `pre` entity spanning the code text.
2. The `pre` entity must include `language: "python"`.
3. The nested `code` entity is not emitted as a separate entity in this shape.
4. Language is extracted from `class` prefix `language-` without regex.
5. If `class` does not start with `language-`, treat `code` as normal `code` entity (subject to parser nesting logic).

## State Machine Requirements

Parser is character-driven and starts in `TEXT` mode.

Minimum modes (existing names may be reused):

1. `TEXT`
2. `TAG_OPEN`
3. `OPEN_TAG_NAME`
4. `CLOSE_TAG_NAME`
5. `ATTR_NAME`
6. `ATTR_VALUE`
7. `ATTR_INVALID`
8. `ENTITY_START`
9. `ENTITY_NUMERIC_START`
10. `ENTITY_HEX_START`

Transition requirements:

1. `<` in `TEXT` starts tag attempt.
2. `&` in `TEXT` starts entity attempt.
3. Invalid parse attempts must gracefully fall back to literal buffered text.
4. Tags must allow trailing whitespace before final `>` (for example `</b   >` or `<blockquote expandable       >`).
5. Tag/attribute name matching should be case-insensitive.

## Tag Stack and Matching Rules

1. Maintain per-tag stack(s) for openings to support nesting.
2. On valid opening completion, push tag draft with:
   - canonical/lowercase name
   - text offset at open
   - parsed attrs
   - exact original opening text for fallback
3. On closing completion:
   - if no matching opening exists, emit closing sequence as plain text
   - if matching opening exists, emit mapped entity with `offset` and `length`
4. Preserve plain text output ordering exactly as user input would read without markup.

## Malformed Input and Recovery Rules

1. Unsupported tag names are treated as literal text.
2. Unsupported/invalid entity sequences are literal text.
3. Unknown attributes should not crash parser.
4. Incomplete constructs at end-of-input are emitted as literal text.
5. Unmatched opening tags at end-of-input are rendered back into output as plain text (for example `<b>bold` -> `<b>bold`).

## EOF Finalization Rules (`toFormattedString`)

When materializing output:

1. Flush any active fallback buffers as plain text.
2. Convert unmatched opening tags into plain text using stored `originalText` and original offsets.
3. Ensure entity offsets remain correct after reinsertion of unmatched tag text.
4. Return `new FormattedString(text, entities)`.

## Acceptance Test Matrix

Minimum validation must include all cases below.

### Required additions from request

1. Input:
   ```html
   <pre><code class="language-python">pre-formatted fixed-width code block written in the Python programming language</code></pre>
   ```
   Expected:
   - `rawText` is `pre-formatted fixed-width code block written in the Python programming language`
   - one entity
   - entity type `pre`
   - entity has `language: "python"`

2. Input:
   ```html
   <span class="tg-spoiler">spoiler</span>
   ```
   Expected:
   - `rawText` is `spoiler`
   - one entity of type `spoiler`

3. Input:
   ```html
   <blockquote expandable>
     Expandable block quotation started Expandable block quotation continued
     Expandable block quotation continued Hidden by default part of the block
     quotation started Expandable block quotation continued The last line of the
     block quotation
   </blockquote>
   ```
   Expected:
   - `rawText` equals inner multiline text exactly (including line breaks)
   - one entity of type `expandable_blockquote`

### Additional baseline validation

1. `<tg-emoji emoji-id="5368324170671202286">🙂</tg-emoji>` -> one `custom_emoji` entity with matching `custom_emoji_id`.
2. `<b>bold text</b   >` -> trailing whitespace in closing tag still yields `bold` entity.
3. `<blockquote expandable class="unused">quote</blockquote>` -> yields `expandable_blockquote`.
4. Streamed chunks across boundaries (`add()` called multiple times) preserve correctness for tags and entities.
5. Unclosed opening tag at EOF (`<b>bold`) becomes literal text with no entity.
6. Repeated `toFormattedString()` with no new input returns equivalent result.

## Out of Scope

1. Full HTML5 compliance.
2. Arbitrary named entity catalog beyond explicitly supported ones.
3. DOM-like tree building.
