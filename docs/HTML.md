# HTML Formatting Style

HTML is one of the formatting options supported by Telegram Bot API. It uses
familiar HTML-like tags for text styling.

## Supported Entities

| Entity            | HTML Syntax                                                               | MessageEntity Type      | FormattedString Method              |
| ----------------- | ------------------------------------------------------------------------- | ----------------------- | ----------------------------------- |
| Bold              | `<b>text</b>` or `<strong>text</strong>`                                  | `bold`                  | `bold()`, `b()`                     |
| Italic            | `<i>text</i>` or `<em>text</em>`                                          | `italic`                | `italic()`, `i()`                   |
| Underline         | `<u>text</u>` or `<ins>text</ins>`                                        | `underline`             | `underline()`, `u()`                |
| Strikethrough     | `<s>text</s>`, `<strike>text</strike>`, or `<del>text</del>`              | `strikethrough`         | `strikethrough()`, `s()`            |
| Spoiler           | `<span class="tg-spoiler">text</span>` or `<tg-spoiler>text</tg-spoiler>` | `spoiler`               | `spoiler()`                         |
| Inline URL        | `<a href="URL">text</a>`                                                  | `text_link`             | `link(url)`, `a(url)`               |
| User Mention      | `<a href="tg://user?id=123456">text</a>`                                  | `text_link`             | `mentionUser(text, userId)`         |
| Custom Emoji      | `<tg-emoji emoji-id="5368324170671202286">emoji</tg-emoji>`               | `text_link`             | `customEmoji(placeholder, emojiId)` |
| Inline Code       | `<code>code</code>`                                                       | `code`                  | `code()`                            |
| Pre (Code Block)  | `<pre>code block</pre>`                                                   | `pre`                   | `pre(language)`                     |
| Pre with Language | `<pre><code class="language-python">code</code></pre>`                    | `pre` + `language`      | `pre(language)`                     |
| Blockquote        | `<blockquote>quote</blockquote>`                                          | `blockquote`            | `blockquote()`                      |
| Expandable Quote  | `<blockquote expandable>quote</blockquote>`                               | `expandable_blockquote` | `expandableBlockquote()`            |

## Escaping Rules

Only the following characters need to be escaped in HTML:

| Character | Escape Sequence |
| --------- | --------------- |
| `<`       | `&lt;`          |
| `>`       | `&gt;`          |
| `&`       | `&amp;`         |

All other HTML entities (like `&nbsp;`, `&copy;`, etc.) are **not** supported.

## Nesting Rules

- **Allowed**: Bold, italic, underline, strikethrough, and spoiler can be nested
  within each other.
- **Not allowed**: `<code>` and `<pre>` tags cannot contain any other entities
  and cannot be nested inside other tags.
- **Blockquote**: Cannot be nested inside other blockquotes.

## MessageEntity Mapping

When Telegram parses HTML text, it generates `MessageEntity` objects with:

```typescript
interface MessageEntity {
  type:
    | "bold"
    | "italic"
    | "underline"
    | "strikethrough"
    | "spoiler"
    | "text_link"
    | "code"
    | "pre"
    | "blockquote"
    | "expandable_blockquote";
  offset: number; // UTF-16 code unit offset
  length: number; // Length in UTF-16 code units
  url?: string; // For text_link
  language?: string; // For pre with language
}
```

## FormattedString Usage

This library uses `FormattedString` to represent text with entities, bypassing
the need for HTML parsing entirely:

```typescript
import { bold, fmt, italic, link } from "@grammyjs/parse-mode";

// Create formatted text using entity tags
const formatted = fmt`${bold}Hello${bold} ${italic}world${italic}!`;

// Or use static methods
const greeting = FormattedString.bold("Hello").italic(" world").plain("!");

// Use with grammY
await ctx.reply(formatted.text, { entities: formatted.entities });
```

## Advantages of FormattedString over HTML

1. **No escaping required**: Raw text is stored without HTML entity encoding.
2. **Unicode-safe**: Entity offsets/lengths are calculated automatically.
3. **Composable**: Combine multiple `FormattedString` instances easily.
4. **Type-safe**: TypeScript ensures correct entity types.
5. **No tag matching**: Avoids issues with unclosed or mismatched tags.

## Examples

### HTML Syntax

```html
<b>bold</b>
<i>italic</i>
<u>underline</u>
<s>strikethrough</s>
<span class="tg-spoiler">spoiler</span>
<a href="http://example.com">inline URL</a>
<code>inline code</code>
<pre><code class="language-python">code block</code></pre>
<blockquote>blockquote</blockquote>
```

### Equivalent FormattedString

```typescript
import {
  blockquote,
  bold,
  code,
  fmt,
  italic,
  link,
  pre,
  spoiler,
  strikethrough,
  underline,
} from "@grammyjs/parse-mode";

const formatted = fmt`
${bold}bold${bold}
${italic}italic${italic}
${underline}underline${underline}
${strikethrough}strikethrough${strikethrough}
${spoiler}spoiler${spoiler}
${link("http://example.com")}inline URL${link}
${code}inline code${code}
${pre("python")}code block${pre}
${blockquote}blockquote${blockquote}
`;
```

## Tag Aliases

HTML supports multiple tags for the same entity type:

| Entity        | Primary Tag    | Aliases                     |
| ------------- | -------------- | --------------------------- |
| Bold          | `<b>`          | `<strong>`                  |
| Italic        | `<i>`          | `<em>`                      |
| Underline     | `<u>`          | `<ins>`                     |
| Strikethrough | `<s>`          | `<strike>`, `<del>`         |
| Spoiler       | `<tg-spoiler>` | `<span class="tg-spoiler">` |
