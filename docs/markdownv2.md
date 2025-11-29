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

## Notes

- In this library, `User Mention` is implemented as a `text_link` with a `tg://user` URL, rather than a `text_mention` entity which requires a User object.
- `Custom Emoji` is implemented using a `text_link` pattern in the helper, but maps to `custom_emoji` entity type when used with `FormattedString.customEmoji`. (Correction: Looking at source, `customEmoji` helper uses `fmt`${a(tg://emoji?id=${emoji})}${placeholder}${a}`. So it actually creates a `text_link` in this library's abstraction?
  - Let's re-read `src/format.ts`:
    ```typescript
    export function customEmoji(placeholder: Stringable, emoji: string) {
      return fmt`${a(`tg://emoji?id=${emoji}`)}${placeholder}${a}`;
    }
    ```
    Yes, it uses `a(...)` which creates `{ type: "text_link", url: ... }`.
    So `customEmoji` returns a `text_link` entity.
    I should document what the library *actually* does.

    *Correction on Custom Emoji in table*:
    The library produces `text_link` with `tg://emoji?id=...`.

    *Correction on Blockquote in table*:
    The library has `blockquote` and `expandableBlockquote` functions.
    ```typescript
    export function blockquote() { return buildFormatter("blockquote")(); }
    ```
    This produces `{ type: "blockquote" }`.
    So Blockquote maps to `blockquote` entity.

    Let's verify `mentionUser` again.
    ```typescript
    export function mentionUser(stringLike: Stringable, userId: number) {
      return fmt`${a(`tg://user?id=${userId}`)}${stringLike}${a}`;
    }
    ```
    Produces `text_link`.

    So for the documentation, I will list the `MessageEntity` type produced *by this library*.

Updated Table Row for Custom Emoji:
| **Custom Emoji** | `[😄](tg://emoji?id=123)` | `text_link` (Library implementation) | `FormattedString.customEmoji("😄", "123")` |
