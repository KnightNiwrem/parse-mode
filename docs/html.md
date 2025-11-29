# HTML Style

The HTML style allows using standard HTML tags for formatting.

## Supported Entities

| Feature | Syntax | MessageEntity Type | Library Mapping |
| :--- | :--- | :--- | :--- |
| **Bold** | `<b>bold</b>`, `<strong>bold</strong>` | `bold` | `FormattedString.bold("text")` or `fmt\`${bold}text${bold}\` ` |
| **Italic** | `<i>italic</i>`, `<em>italic</em>` | `italic` | `FormattedString.italic("text")` or `fmt\`${italic}text${italic}\` ` |
| **Underline** | `<u>underline</u>`, `<ins>underline</ins>` | `underline` | `FormattedString.underline("text")` or `fmt\`${underline}text${underline}\` ` |
| **Strikethrough** | `<s>strike</s>`, `<strike>strike</strike>`, `<del>strike</del>` | `strikethrough` | `FormattedString.strikethrough("text")` or `fmt\`${strikethrough}text${strikethrough}\` ` |
| **Spoiler** | `<span class="tg-spoiler">spoiler</span>`, `<tg-spoiler>spoiler</tg-spoiler>` | `spoiler` | `FormattedString.spoiler("text")` or `fmt\`${spoiler}text${spoiler}\` ` |
| **Inline Link** | `<a href="http://www.example.com/">text</a>` | `text_link` | `FormattedString.link("text", "url")` or `fmt\`${link(\"url\")}text${link}\` ` |
| **User Mention** | `<a href="tg://user?id=123456789">text</a>` | `text_link` | `FormattedString.mentionUser("text", 123456789)` or `mentionUser("text", 123456789)` |
| **Inline Code** | `<code>code</code>` | `code` | `FormattedString.code("text")` or `fmt\`${code}text${code}\` ` |
| **Pre-formatted Code** | `<pre>code</pre>` | `pre` | `FormattedString.pre("text", "")` or `fmt\`${pre(\"\")}text${pre}\` ` |
| **Pre-formatted Code (Language)** | `<pre><code class="language-python">code</code></pre>` | `pre` (with language) | `FormattedString.pre("text", "python")` or `fmt\`${pre(\"python\")}text${pre}\` ` |
| **Blockquote** | `<blockquote>text</blockquote>` | `blockquote` | `FormattedString.blockquote("text")` or `fmt\`${blockquote}text${blockquote}\` ` |
| **Expandable Blockquote** | `<blockquote expandable>text</blockquote>` | `expandable_blockquote` | `FormattedString.expandableBlockquote("text")` or `fmt\`${expandableBlockquote}text${expandableBlockquote}\` ` |
| **Custom Emoji** | `<tg-emoji emoji-id="123">😄</tg-emoji>` | `text_link` (Library implementation) | `FormattedString.customEmoji("😄", "123")` or `customEmoji("😄", "123")` |

## Notes

- The library produces `text_link` entities for Custom Emoji and User Mentions, relying on Telegram's URL protocols (`tg://emoji?id=...` and `tg://user?id=...`).
