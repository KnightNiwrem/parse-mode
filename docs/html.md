# HTML Style

This document describes the **HTML** formatting style supported by the Telegram Bot API and how it maps to the `@grammyjs/parse-mode` library.

## Supported Entities

The following table lists the standard HTML tags and the corresponding `FormattedString` methods and `fmt` template tags in this library.

| Feature | HTML Syntax | Library Method | Template Tag |
| :--- | :--- | :--- | :--- |
| **Bold** | `<b>bold</b>`, `<strong>bold</strong>` | `FormattedString.bold("text")` | `bold`, `b` |
| **Italic** | `<i>italic</i>`, `<em>italic</em>` | `FormattedString.italic("text")` | `italic`, `i` |
| **Underline** | `<u>underline</u>`, `<ins>underline</ins>` | `FormattedString.underline("text")` | `underline`, `u` |
| **Strikethrough** | `<s>strike</s>`, `<strike>strike</strike>`, `<del>strike</del>` | `FormattedString.strikethrough("text")` | `strikethrough`, `s` |
| **Spoiler** | `<span class="tg-spoiler">spoiler</span>`, `<tg-spoiler>spoiler</tg-spoiler>` | `FormattedString.spoiler("text")` | `spoiler` |
| **Link** | `<a href="http://www.example.com/">text</a>` | `FormattedString.link("text", "url")` | `link`, `a` |
| **Inline Code** | `<code>inline code</code>` | `FormattedString.code("text")` | `code` |
| **Code Block** | `<pre><code class="language-python">print("hello")</code></pre>` | `FormattedString.pre("text", "language")` | `pre` |
| **Blockquote** | `<blockquote>block quote</blockquote>` | `FormattedString.blockquote("text")` | `blockquote` |
| **Expandable Blockquote** | `<blockquote expandable>expandable block quote</blockquote>` | `FormattedString.expandableBlockquote("text")` | `expandableBlockquote` |
| **User Mention** | `<a href="tg://user?id=123456789">text</a>` | `FormattedString.mentionUser("text", 123456789)` | `mentionUser` (helper) |
| **Custom Emoji** | `<tg-emoji emoji-id="5368324170671202286">👍</tg-emoji>` | `FormattedString.emoji("👍", "5368324170671202286")` | `emoji` |

## Usage Example

```typescript
import { fmt, bold, italic, link } from "@grammyjs/parse-mode";

// The library generates the underlying entity structure, 
// which can then be serialized to HTML if needed, 
// but primarily sends entities directly to Telegram.
const message = fmt`${bold("Hello")} <i>World</i>`;
```

## Escaping

When using `fmt` or `FormattedString`, the library handles necessary escaping automatically. You do not need to manually escape characters like `<`, `>`, `&`.
