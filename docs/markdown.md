# Markdown (Legacy) Style

The legacy Markdown style supports a subset of formatting options.

## Supported Entities

| Feature | Syntax | MessageEntity Type | Library Mapping |
| :--- | :--- | :--- | :--- |
| **Bold** | `*bold text*` | `bold` | `FormattedString.bold("text")` or `fmt\`${bold}text${bold}\` | 
| **Italic** | `_italic text_` | `italic` | `FormattedString.italic("text")` or `fmt\`${italic}text${italic}\` | 
| **Inline Link** | `[text](http://www.example.com/)` | `text_link` | `FormattedString.link("text", "url")` or `fmt\`${link("url")}text${link}\` | 
| **User Mention** | `[text](tg://user?id=123456789)` | `text_link` | `FormattedString.mentionUser("text", 123456789)` or `mentionUser("text", 123456789)` | 
| **Inline Code** | `` `code` `` | `code` | `FormattedString.code("text")` or `fmt\`${code}text${code}\` | 
| **Pre-formatted Code** | ``` ```code``` ``` | `pre` | `FormattedString.pre("text", "")` or `fmt\`${pre("")}text${pre}\` | 
| **Pre-formatted Code (Language)** | ``` ```python code``` ``` | `pre` (with language) | `FormattedString.pre("text", "python")` or `fmt\`${pre("python")}text${pre}\` | 

## Notes

- Legacy Markdown does not support Underline, Strikethrough, Spoiler, Blockquotes, or Custom Emoji entities directly.
- The library can still generate `FormattedString` objects with these entities, but they may not be rendered correctly if sent using `parse_mode: "Markdown"`.
