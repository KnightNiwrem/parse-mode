# MarkdownV2 Style

The MarkdownV2 style is the most comprehensive formatting option provided by Telegram.

## Supported Entities

| Feature | Syntax | MessageEntity Type | Library Mapping |
| :--- | :--- | :--- | :--- |
| **Bold** | `*bold text*` | `bold` | `FormattedString.bold("text")` or `fmt`${bold}text${bold}"`` |
| **Italic** | `_italic text_` | `italic` | `FormattedString.italic("text")` or `fmt`${italic}text${italic}"`` |
| **Underline** | `__underline__` | `underline` | `FormattedString.underline("text")` or `fmt`${underline}text${underline}"`` |
| **Strikethrough** | `~strikethrough~` | `strikethrough` | `FormattedString.strikethrough("text")` or `fmt`${strikethrough}text${strikethrough}"`` |
| **Spoiler** | `||spoiler||` | `spoiler` | `FormattedString.spoiler("text")` or `fmt`${spoiler}text${spoiler}"`` |
| **Inline Link** | `[text](http://www.example.com/)` | `text_link` | `FormattedString.link("text", "url")` or `fmt`${link("url")}text${link}"`` |
| **User Mention** | `[text](tg://user?id=123456789)` | `text_link` | `FormattedString.mentionUser("text", 123456789)` or `mentionUser("text", 123456789)` |
| **Inline Code** | `` `code` `` | `code` | `FormattedString.code("text")` or `fmt`${code}text${code}"`` |
| **Pre-formatted Code** | ``` ```code``` ``` | `pre` | `FormattedString.pre("text", "")` or `fmt`${pre("")}text${pre}"`` |
| **Pre-formatted Code (Language)** | ``` ```python code``` ``` | `pre` (with language) | `FormattedString.pre("text", "python")` or `fmt`${pre("python")}text${pre}"`` |
| **Blockquote** | `>Blockquote` | `blockquote` | `FormattedString.blockquote("text")` or `fmt`${blockquote}text${blockquote}"`` |
| **Expandable Blockquote** | `**>Expandable` | `expandable_blockquote` | `FormattedString.expandableBlockquote("text")` or `fmt`${expandableBlockquote}text${expandableBlockquote}"`` |
| **Custom Emoji** | `[😄](tg://emoji?id=123)` | `custom_emoji` | `FormattedString.customEmoji("😄", "123")` or `customEmoji("😄", "123")` |
