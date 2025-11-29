# MarkdownV2 Style

This document describes the **MarkdownV2** formatting style supported by the Telegram Bot API and how it maps to the `@grammyjs/parse-mode` library.

## Supported Entities

The following table lists the standard MarkdownV2 syntax and the corresponding `FormattedString` methods and `fmt` template tags in this library.

| Feature | MarkdownV2 Syntax | Library Method | Template Tag |
| :--- | :--- | :--- | :--- |
| **Bold** | `*bold text*` | `FormattedString.bold("text")` | `bold`, `b` |
| **Italic** | `_italic text_` | `FormattedString.italic("text")` | `italic`, `i` |
| **Underline** | `__underline__` | `FormattedString.underline("text")` | `underline`, `u` |
| **Strikethrough** | `~strikethrough~` | `FormattedString.strikethrough("text")` | `strikethrough`, `s` |
| **Spoiler** | `||spoiler||` | `FormattedString.spoiler("text")` | `spoiler` |
| **Link** | `[text](http://www.example.com/)` | `FormattedString.link("text", "url")` | `link`, `a` |
| **Inline Code** | `` `inline code` `` | `FormattedString.code("text")` | `code` |
| **Code Block** | ```` ```python\nprint("hello")\n``` ```` | `FormattedString.pre("text", "language")` | `pre` |
| **Blockquote** | `>block quote` | `FormattedString.blockquote("text")` | `blockquote` |
| **Expandable Blockquote** | `**>expandable block quote` | `FormattedString.expandableBlockquote("text")` | `expandableBlockquote` |
| **User Mention** | `[text](tg://user?id=123456789)` | `FormattedString.mentionUser("text", 123456789)` | `mentionUser` (helper) |
| **Custom Emoji** | `![👍](tg://emoji?id=5368324170671202286)` | `FormattedString.emoji("👍", "5368324170671202286")` | `emoji` |

## Usage Example

```typescript
import { fmt, bold, italic, link } from "@grammyjs/parse-mode";

// Using the fmt template literal (Recommended)
const message = fmt`${bold("Welcome!")}
Check out our ${link("website", "https://grammy.dev")}.
${italic("Note: This uses MarkdownV2 style internaly.")}`;

// Using the Fluent API
const message2 = new FormattedString("Welcome!")
  .bold()
  .append("\nCheck out our ")
  .append(new FormattedString("website").link("https://grammy.dev"));
```

```