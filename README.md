# Parse Mode plugin for grammY

This plugin provides a transformer for setting default `parse_mode`, and a middleware for hydrating `Context` with familiar `reply` variant methods - i.e. `replyWithHTML`, `replyWithMarkdown`, etc.

## Usage

```
import { Bot, Composer } from 'grammy';
import { hydrateReply, parseMode } from 'parse-mode';

import type { ParseModeContext } from 'parse-mode';

const bot = new Bot<ParseModeContext>('');

// Install familiar reply variants to ctx
bot.use(hydrateReply);

// Sets default parse_mode for ctx.reply
bot.api.config.use(parseMode('MarkdownV2'));

bot.command('demo', async ctx => {
  await ctx.reply('*This* is _the_ default `formatting`');
  await ctx.replyWithHTML('<b>This</b> is <i>withHTML</i> <code>formatting</code>');
  await ctx.replyWithMarkdown('*This* is _withMarkdown_ `formatting`');
  await ctx.replyWithMarkdownV1('*This* is _withMarkdownV1_ `formatting`');
  await ctx.replyWithMarkdownV2('*This* is _withMarkdownV2_ `formatting`');
});

bot.start();
```
