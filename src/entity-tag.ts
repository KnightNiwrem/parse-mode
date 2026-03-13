import type { MessageEntity } from "./deps.deno.ts";

/**
 * Represents an entity tag used for formatting text via fmt.
 */
export type EntityTag = Omit<MessageEntity, "offset" | "length">;

function buildFormatter<T extends MessageEntity["type"]>(
  type: T,
): (
  formatOpts?: Omit<MessageEntity & { type: T }, "type" | "offset" | "length">,
) => EntityTag {
  return (formatOpts) => {
    return { type, ...formatOpts };
  };
}

// === Native entity tag functions
/**
 * Alias for `bold` entity tag. Incompatible with `code` and `pre`.
 */
export function b() {
  return buildFormatter("bold")();
}
/**
 * `bold` entity tag. Incompatible with `code` and `pre`.
 */
export function bold() {
  return buildFormatter("bold")();
}
/**
 * Alias for `italic` entity tag. Incompatible with `code` and `pre`.
 */
export function i() {
  return buildFormatter("italic")();
}
/**
 * `italic` entity tag. Incompatible with `code` and `pre`.
 */
export function italic() {
  return buildFormatter("italic")();
}
/**
 * Alias for `strikethrough` entity tag. Incompatible with `code` and `pre`.
 */
export function s() {
  return buildFormatter("strikethrough")();
}
/**
 * `strikethrough` entity tag. Incompatible with `code` and `pre`.
 */
export function strikethrough() {
  return buildFormatter("strikethrough")();
}
/**
 * Alias for `underline` entity tag. Incompatible with `code` and `pre`.
 */
export function u() {
  return buildFormatter("underline")();
}
/**
 * `underline` entity tag. Incompatible with `code` and `pre`.
 */
export function underline() {
  return buildFormatter("underline")();
}

/**
 * Alias for `link` entity tag. Incompatible with `code` and `pre`.
 * @param url The URL to link to.
 */
export function a(url: string) {
  return buildFormatter("text_link")({ url });
}
/**
 * `link` entity tag. Incompatible with `code` and `pre`.
 * @param url The URL to link to.
 */
export function link(url: string) {
  return buildFormatter("text_link")({ url });
}

/**
 * `code` entity tag. Cannot be combined with any other formats.
 */
export function code() {
  return buildFormatter("code")();
}
/**
 * `pre` entity tag. Cannot be combined with any other formats.
 * @param language The language of the code block.
 */
export function pre(language?: string) {
  return buildFormatter("pre")({ language });
}

/**
 * `spoiler` entity tag. Incompatible with `code` and `pre`.
 */
export function spoiler() {
  return buildFormatter("spoiler")();
}

/**
 * `custom_emoji` entity tag. Incompatible with `code` and `pre`.
 * @param customEmojiId The custom emoji ID.
 */
export function emoji(customEmojiId: string) {
  return buildFormatter("custom_emoji")({ custom_emoji_id: customEmojiId });
}

export function time(
  unixTime: number,
  dateTimeFormat?: MessageEntity.DateTimeMessageEntity["date_time_format"],
) {
  return buildFormatter("date_time")({
    unix_time: unixTime,
    date_time_format: dateTimeFormat ?? "",
  });
}

/**
 * `blockquote` entity tag. Cannot be nested.
 */
export function blockquote() {
  return buildFormatter("blockquote")();
}
/**
 * `expandable_blockquote` entity tag. Cannot be nested.
 */
export function expandableBlockquote() {
  return buildFormatter("expandable_blockquote")();
}
