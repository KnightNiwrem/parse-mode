# Parse Mode Plugin for grammY

This library provides simplified formatting utilities for the [grammY](https://grammy.dev) Telegram Bot framework. It enables you to compose richly formatted messages using a declarative, type-safe API.

With this plugin, you can:

- Use tagged template literals and formatters (like bold, italic, link, etc.) to build formatted messages and captions
- Apply formatting to text and media captions using the `fmt` function or the `FormattedString` class
- Chain multiple formatting operations with a fluent API
- Create complex formatted messages with precise control over formatting entities

The plugin is compatible with both Deno and Node.js, and is designed to work as a drop-in enhancement for grammY bots that need robust formatting capabilities.

## Table of Contents

- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Available Formatting Options](#available-formatting-options)
- [Using the fmt Function](#using-the-fmt-function)
- [Using the FormattedString Class](#using-the-formattedstring-class)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [Compatibility and Limitations](#compatibility-and-limitations)

## Installation

### Deno

```ts
// Import from JSR (recommended)
import { fmt, FormattedString } from "jsr:@grammyjs/parse-mode";

// Or from deno.land
import { fmt, FormattedString } from "https://deno.land/x/grammy_parse_mode/mod.ts";
```

### Node.js

```bash
# Using npm
npm install @grammyjs/parse-mode

# Using yarn
yarn add @grammyjs/parse-mode

# Using pnpm
pnpm add @grammyjs/parse-mode
```

Then import it in your code:

```ts
import { fmt, FormattedString } from "@grammyjs/parse-mode";
```

## Core Concepts

### Message Entities in Telegram

In the Telegram Bot API, formatted text is represented using "entities" - special markers that define which parts of the text should be formatted in specific ways. Each entity has a type (e.g., `bold`, `italic`), an offset (where it starts in the text), and a length (how many characters it affects).

Working directly with these entities can be cumbersome as you need to manually track offsets and lengths. The Parse Mode plugin solves this problem by providing a simple, declarative API for formatting text.

### Two Approaches: `fmt` and `FormattedString`

This library offers two main approaches to text formatting:

1. **`fmt` Tagged Template Function**: A template literal tag that allows you to write formatted text in a natural way using template expressions. It internally manages entity offsets and lengths for you.

2. **`FormattedString` Class**: A class-based approach that allows you to build formatted text through method chaining. This is particularly useful for programmatically constructing complex formatted messages.

Both approaches produce compatible output objects that work seamlessly with grammY's message sending methods.

## Available Formatting Options

The library supports all formatting options available in the Telegram Bot API:

| Format Type | Function | Alias | Description |
|-------------|----------|-------|-------------|
| Bold | `bold()` | `b()` | Makes text bold |
| Italic | `italic()` | `i()` | Makes text italic |
| Underline | `underline()` | `u()` | Adds an underline to text |
| Strikethrough | `strikethrough()` | `s()` | Adds a strikethrough to text |
| Code | `code()` | - | Formats text as inline code |
| Pre | `pre(language)` | - | Creates a code block with optional syntax highlighting |
| Link | `link(url)` | `a(url)` | Creates a hyperlink |
| Spoiler | `spoiler()` | - | Creates a spoiler that users need to tap to reveal |
| Blockquote | `blockquote()` | - | Creates a blockquote |
| Expandable blockquote | `expandableBlockquote()` | - | Creates a collapsible blockquote |

Additionally, the library provides utility functions for:

- User mentions: `mentionUser(text, userId)`
- Custom emoji: `customEmoji(placeholder, emojiId)`
- Message links: `linkMessage(text, chatId, messageId)`

### Compatibility Notes

- The `code` and `pre` formats cannot be combined with any other formatting
- Blockquotes cannot be nested
- Most other formats can be combined (e.g., you can have bold+italic text)

## Using the fmt Function

The `fmt` function is a tagged template literal that lets you write formatted text in a natural way. It handles the creation and positioning of entities automatically.

### Basic Usage

```ts
import { Bot } from "grammy";
import { fmt, b, i, code } from "@grammyjs/parse-mode";

const bot = new Bot("YOUR_BOT_TOKEN");

bot.command("format", async (ctx) => {
  // Basic formatting with fmt
  const formattedText = fmt`Hello, ${b}bold${b} and ${i}italic${i} and ${code}code${code}!`;
  
  // Send the formatted message
  await ctx.reply(formattedText.text, { entities: formattedText.entities });
});

bot.start();
```

### Combining Multiple Formats

You can combine different formatting styles in a single message:

```ts
const message = fmt`
  ${b}Important${b}: Please ${u}read${u} the ${i}following${i} information.
  ${code}console.log("Hello World");${code}
`;
```

### Using with Variables

You can include variables and other dynamic content:

```ts
const username = "Alice";
const score = 42;

const message = fmt`Hello, ${b}${username}${b}! Your score is ${i}${score}${i}.`;
```

### Nesting FormattedString Objects

You can use previously formatted text within new `fmt` calls:

```ts
const header = fmt`${b}Welcome!${b}`;
const body = fmt`${i}This is an important message.${i}`;

const fullMessage = fmt`${header}\n\n${body}`;
```

## Using the FormattedString Class

The `FormattedString` class provides an object-oriented approach to text formatting. It's especially useful for building complex formatted messages programmatically.

### Static Methods

Every formatting option is available as a static method:

```ts
import { Bot } from "grammy";
import { FormattedString } from "@grammyjs/parse-mode";

const bot = new Bot("YOUR_BOT_TOKEN");

bot.command("static", async (ctx) => {
  // Using static methods
  const boldText = FormattedString.bold("This is bold");
  const italicText = FormattedString.italic("This is italic");
  
  await ctx.reply(boldText.text, { entities: boldText.entities });
  await ctx.reply(italicText.text, { entities: italicText.entities });
});
```

### Method Chaining

One of the most powerful features of the `FormattedString` class is the ability to chain methods:

```ts
import { Bot } from "grammy";
import { FormattedString } from "@grammyjs/parse-mode";

const bot = new Bot("YOUR_BOT_TOKEN");

bot.command("chain", async (ctx) => {
  // Create a complex formatted message with chaining
  const message = new FormattedString("Hello, ")
    .bold("world")
    .plain("! Welcome to ")
    .italic("grammY")
    .plain(".\n\nCheck out ")
    .link("our documentation", "https://grammy.dev")
    .plain(".");
  
  await ctx.reply(message.text, { entities: message.entities });
});
```

### Building Messages Programmatically

The `FormattedString` approach is particularly useful for building messages dynamically:

```ts
function buildUserMessage(user, items) {
  let message = new FormattedString("")
    .bold(`Hello, ${user.name}!`)
    .plain("\n\nYour cart contains:");

  for (const item of items) {
    message = message
      .plain("\n- ")
      .italic(item.name)
      .plain(`: $${item.price.toFixed(2)}`);
  }

  const total = items.reduce((sum, item) => sum + item.price, 0);
  message = message
    .plain("\n\n")
    .bold(`Total: $${total.toFixed(2)}`);

  return message;
}
```

## Advanced Usage

### User Mentions

Create clickable mentions that open a user's profile:

```ts
// Using fmt
const mention = fmt`Check out ${mentionUser("@admin", 123456789)}`;

// Using FormattedString
const mention = FormattedString.mentionUser("@admin", 123456789);
// Or with chaining
const message = new FormattedString("Check out ").mentionUser("@admin", 123456789);
```

### Custom Emoji

Add custom emoji to your messages:

```ts
// Using fmt
const message = fmt`Look at this ${customEmoji("🎉", "5123456789123456789")}`;

// Using FormattedString
const message = new FormattedString("Look at this ")
  .customEmoji("🎉", "5123456789123456789");
```

### Message Links

Create links to specific messages:

```ts
// Using fmt
const link = fmt`See ${linkMessage("this announcement", -1001234567890, 42)}`;

// Using FormattedString
const link = new FormattedString("See ")
  .linkMessage("this announcement", -1001234567890, 42);
```

### Complex Examples

Combining multiple formatting types for rich messages:

```ts
const message = new FormattedString("📘 ")
  .bold("Article: ")
  .italic("Understanding JavaScript Promises")
  .plain("\n\n")
  .blockquote("Promises are a pattern for handling asynchronous operations in JavaScript.")
  .plain("\n\n")
  .plain("Example code:\n")
  .pre(`async function getData() {
  const response = await fetch('https://api.example.com/data');
  return response.json();
}`, "javascript")
  .plain("\n\nRead more: ")
  .link("JavaScript Docs", "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise");
```

## API Reference

### Functions

#### `fmt`

```ts
function fmt(
  rawStringParts: TemplateStringsArray,
  ...entityTagsOrFormattedTextObjects: (
    | Stringable
    | TextWithEntities
    | CaptionWithEntities
    | EntityTag
    | (() => EntityTag)
  )[]
): FormattedString
```

#### Formatting Functions

Each of these functions returns an `EntityTag` that can be used with `fmt`:

- `b()` or `bold()`: Bold formatting
- `i()` or `italic()`: Italic formatting
- `u()` or `underline()`: Underline formatting
- `s()` or `strikethrough()`: Strikethrough formatting
- `code()`: Inline code formatting
- `pre(language: string)`: Code block with optional language for syntax highlighting
- `a(url: string)` or `link(url: string)`: Hyperlink formatting
- `spoiler()`: Spoiler formatting
- `blockquote()`: Blockquote formatting
- `expandableBlockquote()`: Expandable blockquote formatting

#### Utility Functions

- `mentionUser(stringLike: Stringable, userId: number): FormattedString`
- `customEmoji(placeholder: Stringable, emoji: string): FormattedString`
- `linkMessage(stringLike: Stringable, chatId: number, messageId: number): FormattedString`

### The FormattedString Class

#### Constructor

```ts
constructor(rawText: string, rawEntities?: MessageEntity[])
```

#### Properties

- `rawText: string`: The raw text content
- `rawEntities: MessageEntity[]`: The formatting entities
- `text: string`: Alias for rawText
- `entities: MessageEntity[]`: Alias for rawEntities
- `caption: string`: Alias for rawText (used in media captions)
- `caption_entities: MessageEntity[]`: Alias for rawEntities (used in media captions)

#### Static Methods

Each formatting option is available as a static method that returns a new `FormattedString`:

- `static b(text: Stringable): FormattedString`
- `static bold(text: Stringable): FormattedString`
- `static i(text: Stringable): FormattedString`
- `static italic(text: Stringable): FormattedString`
- `static u(text: Stringable): FormattedString`
- `static underline(text: Stringable): FormattedString`
- `static s(text: Stringable): FormattedString`
- `static strikethrough(text: Stringable): FormattedString`
- `static code(text: Stringable): FormattedString`
- `static pre(text: Stringable, language: string): FormattedString`
- `static a(text: Stringable, url: string): FormattedString`
- `static link(text: Stringable, url: string): FormattedString`
- `static spoiler(text: Stringable): FormattedString`
- `static blockquote(text: Stringable): FormattedString`
- `static expandableBlockquote(text: Stringable): FormattedString`
- `static mentionUser(text: Stringable, userId: number): FormattedString`
- `static customEmoji(placeholder: Stringable, emoji: string): FormattedString`
- `static linkMessage(text: Stringable, chatId: number, messageId: number): FormattedString`

#### Instance Methods

Each formatting option is also available as an instance method for chaining:

- `b(text: Stringable): FormattedString`
- `bold(text: Stringable): FormattedString`
- `i(text: Stringable): FormattedString`
- `italic(text: Stringable): FormattedString`
- `u(text: Stringable): FormattedString`
- `underline(text: Stringable): FormattedString`
- `s(text: Stringable): FormattedString`
- `strikethrough(text: Stringable): FormattedString`
- `code(text: Stringable): FormattedString`
- `pre(text: Stringable, language: string): FormattedString`
- `a(text: Stringable, url: string): FormattedString`
- `link(text: Stringable, url: string): FormattedString`
- `spoiler(text: Stringable): FormattedString`
- `blockquote(text: Stringable): FormattedString`
- `expandableBlockquote(text: Stringable): FormattedString`
- `mentionUser(text: Stringable, userId: number): FormattedString`
- `customEmoji(placeholder: Stringable, emoji: string): FormattedString`
- `linkMessage(text: Stringable, chatId: number, messageId: number): FormattedString`
- `plain(text: string): FormattedString`: Adds unformatted text

### Interfaces

#### `Stringable`

Objects that implement this interface can be used anywhere a string is expected:

```ts
interface Stringable {
  toString(): string;
}
```

#### `TextWithEntities`

```ts
interface TextWithEntities {
  text: string;
  entities?: MessageEntity[];
}
```

#### `CaptionWithEntities`

```ts
interface CaptionWithEntities {
  caption: string;
  caption_entities?: MessageEntity[];
}
```

#### `EntityTag`

```ts
type EntityTag = Omit<MessageEntity, "offset" | "length">;
```

## Compatibility and Limitations

### Platform Compatibility

- **Deno**: Fully supported
- **Node.js**: Fully supported
- **Browser**: Should work with proper bundling but not a primary target

### Telegram API Limitations

- Some formatting combinations are not supported by Telegram (e.g., code + bold)
- Message links only work with supergroups and channel messages, not private chats
- There are character limits for messages in Telegram (4096 characters)
- Some clients might have limited support for certain formatting types

### Best Practices

- Use formatting judiciously to enhance readability, not detract from it
- Test your messages in different Telegram clients to ensure format compatibility
- When using method chaining with `FormattedString`, start with an empty string or plain text, then build up your formatted message
- For very complex messages, consider breaking them into multiple messages

## Examples

Here are some complete examples showing how to use the library in real-world scenarios:

### Welcome Message with Formatting

```ts
import { Bot } from "grammy";
import { FormattedString } from "@grammyjs/parse-mode";

const bot = new Bot("YOUR_BOT_TOKEN");

bot.command("start", async (ctx) => {
  const username = ctx.from?.first_name || "there";
  
  const welcome = new FormattedString("👋 ")
    .bold(`Hello, ${username}!`)
    .plain("\n\n")
    .italic("Welcome to our awesome bot.")
    .plain("\n\nHere's what you can do:")
    .plain("\n- ")
    .code("/help")
    .plain(": Show available commands")
    .plain("\n- ")
    .code("/about")
    .plain(": Learn more about us")
    .plain("\n\n")
    .link("Visit our website", "https://example.com")
    .plain(" for more information.");
  
  await ctx.reply(welcome.text, { entities: welcome.entities });
});

bot.start();
```

### Dynamic Content with Formatting

```ts
import { Bot } from "grammy";
import { fmt, b, i, code, link } from "@grammyjs/parse-mode";

const bot = new Bot("YOUR_BOT_TOKEN");

bot.command("weather", async (ctx) => {
  // Simulate getting weather data
  const weather = {
    location: "New York",
    temperature: 22,
    condition: "Sunny",
    humidity: 45,
    forecast: [
      { day: "Tomorrow", temp: 24, condition: "Partly Cloudy" },
      { day: "Wednesday", temp: 20, condition: "Rainy" },
    ],
  };
  
  const weatherReport = fmt`
${b}Weather for ${weather.location}${b}

Current: ${i}${weather.temperature}°C, ${weather.condition}${i}
Humidity: ${weather.humidity}%

${b}Forecast:${b}
${code}${weather.forecast[0].day}: ${weather.forecast[0].temp}°C, ${weather.forecast[0].condition}${code}
${code}${weather.forecast[1].day}: ${weather.forecast[1].temp}°C, ${weather.forecast[1].condition}${code}

${link("Full forecast", "https://weather.example.com/" + weather.location.toLowerCase())}
  `;
  
  await ctx.reply(weatherReport.text, { entities: weatherReport.entities });
});

bot.start();
```
