# Markdown Style (Legacy)

This document describes the legacy **Markdown** formatting style supported by the Telegram Bot API and how it maps to the `@grammyjs/parse-mode` library.

> **Note:** This style is legacy and has limited support. It is recommended to use **MarkdownV2** or **HTML** for new bots.

## Supported Entities

The following table lists the standard Markdown (legacy) syntax and the corresponding `FormattedString` methods and `fmt` template tags in this library.

| Feature | Markdown Syntax | Library Method | Template Tag |
| :--- | :--- | :--- | :--- |
| **Bold** | `*bold text*` | `FormattedString.bold("text")` | `bold`, `b` |
| **Italic** | `_italic text_` | `FormattedString.italic("text")` | `italic`, `i` |
| **Link** | `[text](http://www.example.com/)` | `FormattedString.link("text", "url")` | `link`, `a` |
| **Inline Code** | `` `inline code` `` | `FormattedString.code("text")` | `code` |
| **Code Block** | ```` ```pre``` ```` | `FormattedString.pre("text", "")` | `pre` (no language) |
| **User Mention** | `[text](tg://user?id=123456789)` | `FormattedString.mentionUser("text", 123456789)` | `mentionUser` (helper) |

## Limitations

Legacy Markdown does **not** support:
- Underline
- Strikethrough
- Spoilers
- Custom Emoji
- Nested entities
- Escaping inside entities in some cases

## Usage Example

```typescript
import { fmt, bold, italic } from "@grammyjs/parse-mode";

const message = fmt`${bold("Bold")} and ${italic("Italic")}`;
```
