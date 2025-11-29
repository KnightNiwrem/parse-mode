# MarkdownV2 Formatting Style

MarkdownV2 is the recommended Markdown-based formatting option for Telegram Bot
API. It supports a rich set of text formatting features with strict escaping
rules.

## Supported Entities

| Entity            | MarkdownV2 Syntax                             | MessageEntity Type      | FormattedString Method              |
| ----------------- | --------------------------------------------- | ----------------------- | ----------------------------------- |
| Bold              | `*bold text*`                                 | `bold`                  | `bold()`, `b()`                     |
| Italic            | `_italic text_`                               | `italic`                | `italic()`, `i()`                   |
| Underline         | `__underline__`                               | `underline`             | `underline()`, `u()`                |
| Strikethrough     | `~strikethrough~`                             | `strikethrough`         | `strikethrough()`, `s()`            |
| Spoiler           | `\|\|spoiler\|\|`                             | `spoiler`               | `spoiler()`                         |
| Inline URL        | `[text](URL)`                                 | `text_link`             | `link(url)`, `a(url)`               |
| User Mention      | `[text](tg://user?id=123456)`                 | `text_link`             | `mentionUser(text, userId)`         |
| Custom Emoji      | `![emoji](tg://emoji?id=5368324170671202286)` | `text_link`             | `customEmoji(placeholder, emojiId)` |
| Inline Code       | `` `inline code` ``                           | `code`                  | `code()`                            |
| Pre (Code Block)  | `` ```code block``` ``                        | `pre`                   | `pre(language)`                     |
| Pre with Language | `` ```python\ncode``` ``                      | `pre` + `language`      | `pre(language)`                     |
| Blockquote        | `>blockquote`                                 | `blockquote`            | `blockquote()`                      |
| Expandable Quote  | `**>expandable\n>blockquote`                  | `expandable_blockquote` | `expandableBlockquote()`            |

## Escaping Rules

The following characters must be escaped with a preceding backslash (`\`) in
MarkdownV2:

```
_ * [ ] ( ) ~ ` > # + - = | { } . !
```

Inside `code` and `pre` blocks, only the following need escaping:

```
` \
```

Inside inline links `(...)`, only the following need escaping:

```
) \
```

## Nesting Rules

- **Allowed**: Bold, italic, underline, strikethrough, and spoiler can be nested
  within each other.
- **Not allowed**: `code` and `pre` cannot contain any other entities and cannot
  be nested inside other entities.
- **Blockquote**: Cannot be nested inside other blockquotes.

## MessageEntity Mapping

When Telegram parses MarkdownV2 text, it generates `MessageEntity` objects with:

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
the need for MarkdownV2 parsing entirely:

```typescript
import { bold, fmt, italic, link } from "@grammyjs/parse-mode";

// Create formatted text using entity tags
const formatted = fmt`${bold}Hello${bold} ${italic}world${italic}!`;

// Or use static methods
const greeting = FormattedString.bold("Hello").italic(" world").plain("!");

// Use with grammY
await ctx.reply(formatted.text, { entities: formatted.entities });
```

## Advantages of FormattedString over MarkdownV2

1. **No escaping required**: Raw text is stored without special character
   handling.
2. **Unicode-safe**: Entity offsets/lengths are calculated automatically.
3. **Composable**: Combine multiple `FormattedString` instances easily.
4. **Type-safe**: TypeScript ensures correct entity types.

## Examples

### MarkdownV2 Syntax

````
*bold*
_italic_
__underline__
~strikethrough~
||spoiler||
[inline URL](http://example.com)
`inline code`
```python
code block
````

> blockquote

````
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
````
