import { assertEquals, assertInstanceOf, describe, it } from "./deps.test.ts";
import type { MessageEntity } from "../src/deps.deno.ts";
import { FormattedString } from "../src/format.ts";

describe("FormattedString - time formatting methods", () => {
  it("Static time method", () => {
    const text = "March 13, 2026, 14:30";
    const unixTime = 1773412200;
    const dateTimeFormat = "DT";

    const timeFormatted = FormattedString.time(text, unixTime, dateTimeFormat);

    assertInstanceOf(timeFormatted, FormattedString);
    assertEquals(timeFormatted.rawText, text);
    const entity = timeFormatted.rawEntities[0] as
      | MessageEntity.DateTimeMessageEntity
      | undefined;

    assertEquals(timeFormatted.rawEntities.length, 1);
    assertEquals(entity?.type, "date_time");
    assertEquals(entity?.offset, 0);
    assertEquals(entity?.length, text.length);
    assertEquals(entity?.unix_time, unixTime);
    assertEquals(entity?.date_time_format, dateTimeFormat);
  });

  it("Instance time method", () => {
    const initialText = "Reminder: ";
    const text = "March 13, 2026, 14:30";
    const unixTime = 1773412200;
    const dateTimeFormat = "DT";
    const initialFormatted = new FormattedString(initialText);

    const timeResult = initialFormatted.time(text, unixTime, dateTimeFormat);

    assertInstanceOf(timeResult, FormattedString);
    assertEquals(timeResult.rawText, `${initialText}${text}`);
    const entity = timeResult.rawEntities[0] as
      | MessageEntity.DateTimeMessageEntity
      | undefined;

    assertEquals(timeResult.rawEntities.length, 1);
    assertEquals(entity?.type, "date_time");
    assertEquals(entity?.offset, initialText.length);
    assertEquals(entity?.length, text.length);
    assertEquals(entity?.unix_time, unixTime);
    assertEquals(entity?.date_time_format, dateTimeFormat);
  });

  it("Static time method without format", () => {
    const text = "Today";
    const unixTime = 1773412200;

    const timeFormatted = FormattedString.time(text, unixTime);

    assertInstanceOf(timeFormatted, FormattedString);
    assertEquals(timeFormatted.rawText, text);
    const entity = timeFormatted.rawEntities[0] as
      | MessageEntity.DateTimeMessageEntity
      | undefined;

    assertEquals(timeFormatted.rawEntities.length, 1);
    assertEquals(entity?.type, "date_time");
    assertEquals(entity?.offset, 0);
    assertEquals(entity?.length, text.length);
    assertEquals(entity?.unix_time, unixTime);
    assertEquals(entity?.date_time_format, "");
  });
});
