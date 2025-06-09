import { assertEquals, describe, it } from "./deps.test.ts";
import {
  consolidateEntities,
  deepCopyMessageEntity,
  isEntityEqual,
  isEntitySimilar,
  isUserEqual,
} from "../src/util.ts";
import type { MessageEntity, User } from "../src/deps.deno.ts";

// Entity comparison method tests
describe("isEntitySimilar", () => {
  it("basic functionality", () => {
    const entity1: MessageEntity = { type: "bold", offset: 0, length: 5 };
    const entity2: MessageEntity = { type: "bold", offset: 10, length: 3 };
    const entity3: MessageEntity = { type: "italic", offset: 0, length: 5 };

    // Same type, different offset/length should be similar
    assertEquals(isEntitySimilar(entity1, entity2), true);

    // Different type should not be similar
    assertEquals(isEntitySimilar(entity1, entity3), false);
  });

  it("with text_link entities", () => {
    const entity1: MessageEntity = {
      type: "text_link",
      offset: 0,
      length: 5,
      url: "https://example.com",
    };
    const entity2: MessageEntity = {
      type: "text_link",
      offset: 10,
      length: 3,
      url: "https://example.com",
    };
    const entity3: MessageEntity = {
      type: "text_link",
      offset: 0,
      length: 5,
      url: "https://different.com",
    };

    // Same type and URL, different offset/length should be similar
    assertEquals(isEntitySimilar(entity1, entity2), true);

    // Same type but different URL should not be similar
    assertEquals(isEntitySimilar(entity1, entity3), false);
  });

  it("with pre entities", () => {
    const entity1: MessageEntity = {
      type: "pre",
      offset: 0,
      length: 5,
      language: "javascript",
    };
    const entity2: MessageEntity = {
      type: "pre",
      offset: 10,
      length: 3,
      language: "javascript",
    };
    const entity3: MessageEntity = {
      type: "pre",
      offset: 0,
      length: 5,
      language: "python",
    };

    // Same type and language, different offset/length should be similar
    assertEquals(isEntitySimilar(entity1, entity2), true);

    // Same type but different language should not be similar
    assertEquals(isEntitySimilar(entity1, entity3), false);
  });

  it("with custom_emoji entities", () => {
    const entity1: MessageEntity = {
      type: "custom_emoji",
      offset: 0,
      length: 2,
      custom_emoji_id: "123456",
    };
    const entity2: MessageEntity = {
      type: "custom_emoji",
      offset: 5,
      length: 2,
      custom_emoji_id: "123456",
    };
    const entity3: MessageEntity = {
      type: "custom_emoji",
      offset: 0,
      length: 2,
      custom_emoji_id: "789012",
    };

    // Same type and emoji ID, different offset/length should be similar
    assertEquals(isEntitySimilar(entity1, entity2), true);

    // Same type but different emoji ID should not be similar
    assertEquals(isEntitySimilar(entity1, entity3), false);
  });

  it("with text_mention entities", () => {
    const user1 = { id: 123, is_bot: false, first_name: "John" };
    const copyUser1 = { id: 123, is_bot: false, first_name: "John" };
    const user2 = { id: 456, is_bot: false, first_name: "Jane" };

    const entity1: MessageEntity = {
      type: "text_mention",
      offset: 0,
      length: 5,
      user: user1,
    };
    const entity2: MessageEntity = {
      type: "text_mention",
      offset: 10,
      length: 4,
      user: copyUser1,
    };
    const entity3: MessageEntity = {
      type: "text_mention",
      offset: 0,
      length: 5,
      user: user2,
    };

    // Same type and user, different offset/length should be similar
    assertEquals(isEntitySimilar(entity1, entity2), true);

    // Same type but different user should not be similar
    assertEquals(isEntitySimilar(entity1, entity3), false);
  });
});

describe("isEntityEqual", () => {
  it("basic functionality", () => {
    const entity1: MessageEntity = { type: "bold", offset: 0, length: 5 };
    const entity2: MessageEntity = { type: "bold", offset: 0, length: 5 };
    const entity3: MessageEntity = { type: "bold", offset: 10, length: 5 };
    const entity4: MessageEntity = { type: "bold", offset: 0, length: 3 };

    // Identical entities should be equal
    assertEquals(isEntityEqual(entity1, entity2), true);

    // Same type and length but different offset should not be equal
    assertEquals(isEntityEqual(entity1, entity3), false);

    // Same type and offset but different length should not be equal
    assertEquals(isEntityEqual(entity1, entity4), false);
  });

  it("with text_link entities", () => {
    const entity1: MessageEntity = {
      type: "text_link",
      offset: 0,
      length: 5,
      url: "https://example.com",
    };
    const entity2: MessageEntity = {
      type: "text_link",
      offset: 0,
      length: 5,
      url: "https://example.com",
    };
    const entity3: MessageEntity = {
      type: "text_link",
      offset: 0,
      length: 5,
      url: "https://different.com",
    };
    const entity4: MessageEntity = {
      type: "text_link",
      offset: 10,
      length: 5,
      url: "https://example.com",
    };

    // Identical entities should be equal
    assertEquals(isEntityEqual(entity1, entity2), true);

    // Same position but different URL should not be equal
    assertEquals(isEntityEqual(entity1, entity3), false);

    // Same URL but different position should not be equal
    assertEquals(isEntityEqual(entity1, entity4), false);
  });

  it("comprehensive comparison", () => {
    const entity1: MessageEntity = {
      type: "pre",
      offset: 10,
      length: 20,
      language: "typescript",
    };
    const entity2: MessageEntity = {
      type: "pre",
      offset: 10,
      length: 20,
      language: "typescript",
    };
    const entity3: MessageEntity = {
      type: "pre",
      offset: 10,
      length: 20,
      language: "javascript",
    };

    // Completely identical entities should be equal
    assertEquals(isEntityEqual(entity1, entity2), true);

    // Different language should not be equal even with same type, offset, length
    assertEquals(isEntityEqual(entity1, entity3), false);
  });
});

describe("isUserEqual", () => {
  it("identical users", () => {
    const user1: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
      last_name: "Doe",
      username: "johndoe",
    };
    const user2: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
      last_name: "Doe",
      username: "johndoe",
    };

    assertEquals(isUserEqual(user1, user2), true);
  });

  it("different users", () => {
    const user1: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
    };
    const user2: User = {
      id: 456,
      is_bot: false,
      first_name: "Jane",
    };

    assertEquals(isUserEqual(user1, user2), false);
  });

  it("same properties but different values", () => {
    const user1: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
    };
    const user2: User = {
      id: 123,
      is_bot: true,
      first_name: "John",
    };

    assertEquals(isUserEqual(user1, user2), false);
  });

  it("null and undefined handling", () => {
    const user1 = {
      id: 123,
      is_bot: false,
      first_name: "John",
      last_name: null,
      username: undefined,
    } as unknown as User;
    const user2: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
    };

    // null and undefined properties should be considered equal to absent properties
    assertEquals(isUserEqual(user1, user2), true);
  });

  it("undefined vs null equivalence", () => {
    const user1 = {
      id: 123,
      is_bot: false,
      first_name: "John",
      last_name: null,
    } as unknown as User;
    const user2: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
      last_name: undefined,
    };

    // null and undefined should be considered equal
    assertEquals(isUserEqual(user1, user2), true);
  });

  it("extra properties with null/undefined", () => {
    const user1: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
      last_name: "Doe",
    };
    const user2 = {
      id: 123,
      is_bot: false,
      first_name: "John",
      last_name: "Doe",
      username: null,
      language_code: undefined,
    } as unknown as User;

    // Extra null/undefined properties should not affect equality
    assertEquals(isUserEqual(user1, user2), true);
  });

  it("missing vs present property", () => {
    const user1: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
    };
    const user2: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
      username: "johndoe",
    };

    // user2 has a non-null property that user1 doesn't have
    assertEquals(isUserEqual(user1, user2), false);
  });

  it("different property sets", () => {
    const user1: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
      username: "johndoe",
    };
    const user2: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
      last_name: "Doe",
    };

    // Different non-null properties should make users unequal
    assertEquals(isUserEqual(user1, user2), false);
  });

  it("empty object equivalence", () => {
    const user1: User = { id: 123, is_bot: false, first_name: "Test" };
    const user2: User = { id: 123, is_bot: false, first_name: "Test" };

    assertEquals(isUserEqual(user1, user2), true);
  });

  it("complex scenario with mixed null/undefined", () => {
    const user1 = {
      id: 123,
      is_bot: false,
      first_name: "John",
      last_name: null,
      username: "johndoe",
      language_code: undefined,
    } as unknown as User;
    const user2: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
      username: "johndoe",
    };

    // Should be equal despite null/undefined differences
    assertEquals(isUserEqual(user1, user2), true);
  });

  it("boolean properties", () => {
    const user1: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
    };
    const user2: User = {
      id: 123,
      is_bot: false,
      first_name: "John",
    };

    assertEquals(isUserEqual(user1, user2), true);

    const user3: User = {
      id: 123,
      is_bot: true,
      first_name: "John",
    };

    assertEquals(isUserEqual(user1, user3), false);
  });
});

describe("Utility method tests", () => {
  it("Entity comparison methods consistency", () => {
    const entity1: MessageEntity = { type: "italic", offset: 5, length: 10 };
    const entity2: MessageEntity = { type: "italic", offset: 5, length: 10 };
    const entity3: MessageEntity = { type: "italic", offset: 15, length: 8 };

    // If entities are equal, they should also be similar
    assertEquals(isEntityEqual(entity1, entity2), true);
    assertEquals(isEntitySimilar(entity1, entity2), true);

    // Entities can be similar but not equal
    assertEquals(isEntitySimilar(entity1, entity3), true);
    assertEquals(isEntityEqual(entity1, entity3), false);
  });

  it("consolidateEntities method", () => {
    const overlappingBoldEntities: MessageEntity[] = [
      { type: "bold" as const, offset: 0, length: 5 },
      { type: "bold" as const, offset: 3, length: 7 },
    ];

    const consolidatedBold = consolidateEntities(
      overlappingBoldEntities,
    );
    assertEquals(consolidatedBold.length, 1);
    assertEquals(consolidatedBold[0]?.type, "bold");
    assertEquals(consolidatedBold[0]?.offset, 0);
    assertEquals(consolidatedBold[0]?.length, 10);

    // Test adjacent entities (touching but not overlapping)
    const adjacentEntities: MessageEntity[] = [
      { type: "italic" as const, offset: 0, length: 5 },
      { type: "italic" as const, offset: 5, length: 3 },
    ];

    const consolidatedAdjacent = consolidateEntities(
      adjacentEntities,
    );
    assertEquals(consolidatedAdjacent.length, 1);
    assertEquals(consolidatedAdjacent[0]?.type, "italic");
    assertEquals(consolidatedAdjacent[0]?.offset, 0);
    assertEquals(consolidatedAdjacent[0]?.length, 8);

    // Test non-overlapping entities of same type
    const nonOverlappingEntities: MessageEntity[] = [
      { type: "bold" as const, offset: 0, length: 3 },
      { type: "bold" as const, offset: 5, length: 3 },
    ];

    const nonOverlappingResult = consolidateEntities(
      nonOverlappingEntities,
    );
    assertEquals(nonOverlappingResult.length, 2);
    assertEquals(nonOverlappingResult[0]?.offset, 0);
    assertEquals(nonOverlappingResult[0]?.length, 3);
    assertEquals(nonOverlappingResult[1]?.offset, 5);
    assertEquals(nonOverlappingResult[1]?.length, 3);

    // Test different entity types (should not be consolidated)
    const differentTypeEntities: MessageEntity[] = [
      { type: "bold" as const, offset: 0, length: 5 },
      { type: "italic" as const, offset: 3, length: 7 },
    ];

    const differentTypesResult = consolidateEntities(
      differentTypeEntities,
    );
    assertEquals(differentTypesResult.length, 2);
    assertEquals(differentTypesResult[0]?.type, "bold");
    assertEquals(differentTypesResult[1]?.type, "italic");

    // Test entities with different URLs (text_link type)
    const differentUrlEntities: MessageEntity[] = [
      {
        type: "text_link" as const,
        offset: 0,
        length: 5,
        url: "https://example.com",
      },
      {
        type: "text_link" as const,
        offset: 3,
        length: 7,
        url: "https://different.com",
      },
    ];

    const differentUrlResult = consolidateEntities(
      differentUrlEntities,
    );
    assertEquals(differentUrlResult.length, 2); // Should not consolidate different URLs

    // Test entities with same URLs (text_link type)
    const sameUrlEntities: MessageEntity[] = [
      {
        type: "text_link" as const,
        offset: 0,
        length: 5,
        url: "https://example.com",
      },
      {
        type: "text_link" as const,
        offset: 3,
        length: 7,
        url: "https://example.com",
      },
    ];

    const sameUrlResult = consolidateEntities(sameUrlEntities);
    assertEquals(sameUrlResult.length, 1); // Should consolidate same URLs
    assertEquals(sameUrlResult[0]?.length, 10);

    // Test empty array
    const emptyResult = consolidateEntities([]);
    assertEquals(emptyResult.length, 0);

    // Test single entity
    const singleEntity: MessageEntity[] = [
      { type: "bold" as const, offset: 0, length: 5 },
    ];

    const singleResult = consolidateEntities(singleEntity);
    assertEquals(singleResult.length, 1);
    assertEquals(singleResult[0]?.type, "bold");
    assertEquals(singleResult[0]?.offset, 0);
    assertEquals(singleResult[0]?.length, 5);

    // Test unsorted entities (implementation should handle this)
    const unsortedEntities: MessageEntity[] = [
      { type: "bold" as const, offset: 5, length: 3 },
      { type: "bold" as const, offset: 0, length: 6 },
    ];

    const unsortedResult = consolidateEntities(unsortedEntities);
    assertEquals(unsortedResult.length, 1);
    assertEquals(unsortedResult[0]?.offset, 0);
    assertEquals(unsortedResult[0]?.length, 8); // Should span from 0 to 8
  });

  it("consolidateEntities with complex overlapping", () => {
    // Test multiple overlapping entities of the same type
    const multipleOverlapping: MessageEntity[] = [
      { type: "bold" as const, offset: 0, length: 3 },
      { type: "bold" as const, offset: 2, length: 4 },
      { type: "bold" as const, offset: 5, length: 2 },
    ];

    const multipleResult = consolidateEntities(
      multipleOverlapping,
    );
    assertEquals(multipleResult.length, 1);
    assertEquals(multipleResult[0]?.offset, 0);
    assertEquals(multipleResult[0]?.length, 7); // Should span from 0 to 7

    // Test entities that are completely contained within others
    const containedEntities: MessageEntity[] = [
      { type: "italic" as const, offset: 0, length: 10 },
      { type: "italic" as const, offset: 2, length: 3 },
      { type: "italic" as const, offset: 7, length: 2 },
    ];

    const containedResult = consolidateEntities(
      containedEntities,
    );
    assertEquals(containedResult.length, 1);
    assertEquals(containedResult[0]?.offset, 0);
    assertEquals(containedResult[0]?.length, 10); // Should keep the largest span

    // Test 3 overlapping bold entities with 1 italic entity positioned between them
    const mixedOverlapping: MessageEntity[] = [
      { type: "bold" as const, offset: 0, length: 9 }, // bold: 0-9
      { type: "bold" as const, offset: 8, length: 4 }, // bold: 8-12
      { type: "bold" as const, offset: 10, length: 6 }, // bold: 10-16
      { type: "italic" as const, offset: 3, length: 4 }, // italic: 3-7
      { type: "italic" as const, offset: 7, length: 4 }, // italic: 7-11
    ];

    const mixedResult = consolidateEntities(mixedOverlapping);
    assertEquals(mixedResult.length, 2); // Should have 2 entities: 1 bold, 1 italic

    // Find the bold and italic entities in the result
    const boldEntity = mixedResult.find((e) => e.type === "bold");
    const italicEntity = mixedResult.find((e) => e.type === "italic");

    assertEquals(boldEntity?.offset, 0);
    assertEquals(boldEntity?.length, 16); // Should span from 0 to 16 (consolidating all bold entities)
    assertEquals(italicEntity?.offset, 3);
    assertEquals(italicEntity?.length, 8); // Should remain unchanged as it's a different type
  });
});

describe("deepCopyMessageEntity", () => {
  it("basic entity types", () => {
    const boldEntity: MessageEntity = {
      type: "bold",
      offset: 5,
      length: 10,
    };

    const copiedBold = deepCopyMessageEntity(boldEntity);

    // Should be equal but not the same object
    assertEquals(isEntityEqual(boldEntity, copiedBold), true);
    assertEquals(boldEntity !== copiedBold, true);

    // Test with italic entity
    const italicEntity: MessageEntity = {
      type: "italic",
      offset: 0,
      length: 15,
    };

    const copiedItalic = deepCopyMessageEntity(italicEntity);
    assertEquals(isEntityEqual(italicEntity, copiedItalic), true);
    assertEquals(italicEntity !== copiedItalic, true);
  });

  it("text_link entity", () => {
    const textLinkEntity: MessageEntity = {
      type: "text_link",
      offset: 10,
      length: 8,
      url: "https://example.com",
    };

    const copied = deepCopyMessageEntity(textLinkEntity);

    // Should be equal but not the same object
    assertEquals(isEntityEqual(textLinkEntity, copied), true);
    assertEquals(textLinkEntity !== copied, true);

    // Modifying the copy should not affect the original
    if (copied.type === "text_link") {
      copied.url = "https://different.com";
    }
    assertEquals(textLinkEntity.type === "text_link" && textLinkEntity.url, "https://example.com");
  });

  it("pre entity with language", () => {
    const preEntity: MessageEntity = {
      type: "pre",
      offset: 0,
      length: 20,
      language: "typescript",
    };

    const copied = deepCopyMessageEntity(preEntity);

    assertEquals(isEntityEqual(preEntity, copied), true);
    assertEquals(preEntity !== copied, true);

    // Modifying the copy should not affect the original
    if (copied.type === "pre") {
      copied.language = "javascript";
    }
    assertEquals(preEntity.type === "pre" && preEntity.language, "typescript");
  });

  it("pre entity without language", () => {
    const preEntity: MessageEntity = {
      type: "pre",
      offset: 5,
      length: 12,
    };

    const copied = deepCopyMessageEntity(preEntity);

    assertEquals(isEntityEqual(preEntity, copied), true);
    assertEquals(preEntity !== copied, true);
    assertEquals(copied.type === "pre" && copied.language, undefined);
  });

  it("custom_emoji entity", () => {
    const customEmojiEntity: MessageEntity = {
      type: "custom_emoji",
      offset: 2,
      length: 2,
      custom_emoji_id: "123456789",
    };

    const copied = deepCopyMessageEntity(customEmojiEntity);

    assertEquals(isEntityEqual(customEmojiEntity, copied), true);
    assertEquals(customEmojiEntity !== copied, true);

    // Modifying the copy should not affect the original
    if (copied.type === "custom_emoji") {
      copied.custom_emoji_id = "987654321";
    }
    assertEquals(
      customEmojiEntity.type === "custom_emoji" && customEmojiEntity.custom_emoji_id,
      "123456789"
    );
  });

  it("text_mention entity with deep user copy", () => {
    const user: User = {
      id: 123456,
      is_bot: false,
      first_name: "John",
      last_name: "Doe",
      username: "johndoe",
      language_code: "en",
    };

    const textMentionEntity: MessageEntity = {
      type: "text_mention",
      offset: 0,
      length: 4,
      user: user,
    };

    const copied = deepCopyMessageEntity(textMentionEntity);

    // Should be equal but not the same object
    assertEquals(isEntityEqual(textMentionEntity, copied), true);
    assertEquals(textMentionEntity !== copied, true);

    // User objects should also be different instances
    if (copied.type === "text_mention") {
      assertEquals(copied.user !== user, true);
      assertEquals(isUserEqual(copied.user, user), true);

      // Modifying the copied user should not affect the original
      copied.user.first_name = "Jane";
      assertEquals(user.first_name, "John");
      assertEquals(copied.user.first_name, "Jane");
    }
  });

  it("text_mention entity with minimal user", () => {
    const user: User = {
      id: 789,
      is_bot: true,
      first_name: "Bot",
    };

    const textMentionEntity: MessageEntity = {
      type: "text_mention",
      offset: 5,
      length: 3,
      user: user,
    };

    const copied = deepCopyMessageEntity(textMentionEntity);

    assertEquals(isEntityEqual(textMentionEntity, copied), true);
    assertEquals(textMentionEntity !== copied, true);

    if (copied.type === "text_mention") {
      assertEquals(copied.user !== user, true);
      assertEquals(isUserEqual(copied.user, user), true);
      assertEquals(copied.user.last_name, undefined);
      assertEquals(copied.user.username, undefined);
    }
  });

  it("deep copy independence", () => {
    const originalUser: User = {
      id: 999,
      is_bot: false,
      first_name: "Original",
      last_name: "User",
    };

    const originalEntity: MessageEntity = {
      type: "text_mention",
      offset: 0,
      length: 8,
      user: originalUser,
    };

    const copied = deepCopyMessageEntity(originalEntity);

    // Modify the original
    originalEntity.offset = 10;
    originalEntity.length = 5;
    originalUser.first_name = "Modified";

    // The copy should remain unchanged
    assertEquals(copied.offset, 0);
    assertEquals(copied.length, 8);
    if (copied.type === "text_mention") {
      assertEquals(copied.user.first_name, "Original");
    }
  });

  it("all basic entity types", () => {
    const entityTypes = [
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "spoiler",
      "code",
      "mention",
      "hashtag",
      "cashtag",
      "bot_command",
      "url",
      "email",
      "phone_number",
      "blockquote",
      "expandable_blockquote",
    ] as const;

    for (const type of entityTypes) {
      const entity: MessageEntity = {
        type,
        offset: 1,
        length: 5,
      };

      const copied = deepCopyMessageEntity(entity);

      assertEquals(isEntityEqual(entity, copied), true);
      assertEquals(entity !== copied, true);
      assertEquals(copied.type, type);
      assertEquals(copied.offset, 1);
      assertEquals(copied.length, 5);
    }
  });
});
