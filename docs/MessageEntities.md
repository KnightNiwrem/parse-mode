# Message Entities Formatting Style

Message Entities is the most powerful and recommended formatting approach for
Telegram Bot API. Instead of using `parse_mode`, you send plain text along with
an array of entity objects that define the formatting.

## Supported Entity Types

| Entity Type             | Description                           | FormattedString Method              |
| ----------------------- | ------------------------------------- | ----------------------------------- |
| `bold`                  | Bold text                             | `bold()`, `b()`                     |
| `italic`                | Italic text                           | `italic()`, `i()`                   |
| `underline`             | Underlined text                       | `underline()`, `u()`                |
| `strikethrough`         | Strikethrough text                    | `strikethrough()`, `s()`            |
| `spoiler`               | Spoiler text (hidden until tapped)    | `spoiler()`                         |
| `text_link`             | Clickable text with URL               | `link(url)`, `a(url)`               |
| `text_mention`          | Mention without username (by user ID) | `mentionUser(text, userId)`         |
| `custom_emoji`          | Custom emoji                          | `customEmoji(placeholder, emojiId)` |
| `code`                  | Inline monospace code                 | `code()`                            |
| `pre`                   | Code block (with optional language)   | `pre(language)`                     |
| `blockquote`            | Block quotation                       | `blockquote()`                      |
| `expandable_blockquote` | Collapsible block quotation           | `expandableBlockquote()`            |
| `mention`               | @username mention (auto-detected)     | N/A (auto-detected by Telegram)     |
| `hashtag`               | #hashtag (auto-detected)              | N/A (auto-detected by Telegram)     |
| `cashtag`               | $USD cashtag (auto-detected)          | N/A (auto-detected by Telegram)     |
| `bot_command`           | /command (auto-detected)              | N/A (auto-detected by Telegram)     |
| `url`                   | URL (auto-detected)                   | N/A (auto-detected by Telegram)     |
| `email`                 | email@example.com (auto-detected)     | N/A (auto-detected by Telegram)     |
| `phone_number`          | Phone number (auto-detected)          | N/A (auto-detected by Telegram)     |

## MessageEntity Structure

Each entity is defined with the following structure:

```typescript
interface MessageEntity {
  type: string; // Entity type from the table above
  offset: number; // Offset in UTF-16 code units from start of text
  length: number; // Length in UTF-16 code units
  url?: string; // For text_link type
  user?: User; // For text_mention type
  language?: string; // For pre type with syntax highlighting
  custom_emoji_id?: string; // For custom_emoji type
}
```

## UTF-16 Code Units

**Critical**: Entity `offset` and `length` are measured in **UTF-16 code
units**, not characters or Unicode code points.

| Character        | Code Points | UTF-16 Code Units |
| ---------------- | ----------- | ----------------- |
| ASCII (a-z, 0-9) | 1           | 1                 |
| Most emoji       | 1           | 2                 |
| Complex emoji    | Multiple    | 4+                |
| CJK characters   | 1           | 1                 |

`FormattedString` handles this automatically, but if you build entities
manually, use JavaScript's string length (which counts UTF-16 code units).

## FormattedString Mapping

This library provides `FormattedString` which generates `MessageEntity` arrays
automatically:

```typescript
import { bold, fmt, italic, link } from "@grammyjs/parse-mode";

// Create formatted text using template literals
const formatted = fmt`${bold}Hello${bold} ${italic}world${italic}!`;

// Access the generated entities
console.log(formatted.rawText); // "Hello world!"
console.log(formatted.rawEntities);
// [
//   { type: "bold", offset: 0, length: 5 },
//   { type: "italic", offset: 6, length: 5 }
// ]

// Use with grammY
await ctx.reply(formatted.text, { entities: formatted.entities });
```

## Advantages of Message Entities

1. **No escaping**: Plain text is sent as-is, no special characters to escape.
2. **Precise control**: Exact offset and length for each entity.
3. **Unicode-safe**: Works correctly with emoji and international text.
4. **Composable**: Entities can overlap (where allowed) without parsing issues.
5. **Future-proof**: New entity types work without parser changes.

## Entity Compatibility Rules

### Can Nest/Overlap

- Bold, italic, underline, strikethrough, spoiler can all nest within each
  other.
- Links can contain bold, italic, underline, strikethrough.

### Cannot Nest

- `code` and `pre` cannot contain any other entities.
- `code` and `pre` cannot be nested inside other entities.
- `blockquote` and `expandable_blockquote` cannot be nested inside each other.

## FormattedString API

### Entity Tag Functions

```typescript
import {
  a,
  b,
  blockquote,
  bold,
  code,
  expandableBlockquote,
  i,
  italic,
  link,
  pre,
  s,
  spoiler,
  strikethrough,
  u,
  underline,
} from "@grammyjs/parse-mode";
```

### Using fmt Template Literal

```typescript
// Basic formatting
const text = fmt`${bold}Bold${bold} and ${italic}italic${italic}`;

// Links
const linked = fmt`${link("https://example.com")}Click here${link}`;

// Code blocks
const codeBlock = fmt`${pre("typescript")}const x = 1;${pre}`;

// Nested formatting
const nested = fmt`${bold}${italic}Bold and italic${italic}${bold}`;
```

### Using Static Methods

```typescript
const text = FormattedString.bold("Bold")
  .plain(" and ")
  .italic("italic")
  .plain("!");
```

### Utility Functions

```typescript
import { customEmoji, linkMessage, mentionUser } from "@grammyjs/parse-mode";

// Mention a user by ID
const mention = mentionUser("John", 123456789);

// Link to a message
const msgLink = linkMessage("See this message", -1001234567890, 42);

// Insert custom emoji
const emoji = customEmoji("👋", "5368324170671202286");
```

## Examples

### Building Complex Messages

```typescript
import { bold, code, fmt, italic, link } from "@grammyjs/parse-mode";

const message = fmt`
${bold}Welcome to our bot!${bold}

Here are some ${italic}features${italic}:
• Use ${code}/help${code} to get started
• Visit our ${link("https://example.com")}website${link}
`;

await ctx.reply(message.text, { entities: message.entities });
```

### Joining Multiple FormattedStrings

```typescript
const parts = [
  FormattedString.bold("Title"),
  fmt`${italic}Subtitle${italic}`,
  "Plain text",
];

const combined = FormattedString.join(parts, fmt`\n`);
```

### Splitting Formatted Text

```typescript
const text = fmt`${bold}Line 1${bold}\n${italic}Line 2${italic}`;
const lines = text.splitByText(fmt`\n`);
// Returns array of FormattedString, preserving entities
```

## Comparison with parse_mode

| Aspect           | parse_mode (HTML/MarkdownV2)       | Message Entities         |
| ---------------- | ---------------------------------- | ------------------------ |
| Escaping         | Required for special characters    | Not required             |
| Unicode handling | Can be tricky with offsets         | Automatic                |
| Nesting          | Must follow strict syntax rules    | Explicitly defined       |
| Error handling   | Parse errors possible              | No parsing needed        |
| Debugging        | Inspect formatted string           | Inspect entity array     |
| Composability    | String concatenation with escaping | Entity offset adjustment |
