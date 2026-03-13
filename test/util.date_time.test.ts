import { assertEquals, describe, it } from "./deps.test.ts";
import {
  canConsolidateEntities,
  consolidateEntities,
  isEntitiesEqual,
  isEntityEqual,
  isEntitySimilar,
} from "../src/util.ts";
import type { MessageEntity } from "../src/deps.deno.ts";

describe("util - date_time entities", () => {
  it("isEntitySimilar considers unix_time and date_time_format", () => {
    const entity: MessageEntity = {
      type: "date_time",
      offset: 0,
      length: 5,
      unix_time: 1773412200,
      date_time_format: "DT",
    };
    const same: MessageEntity = {
      type: "date_time",
      offset: 10,
      length: 5,
      unix_time: 1773412200,
      date_time_format: "DT",
    };
    const differentUnixTime: MessageEntity = {
      type: "date_time",
      offset: 10,
      length: 5,
      unix_time: 1773412201,
      date_time_format: "DT",
    };
    const differentFormat: MessageEntity = {
      type: "date_time",
      offset: 10,
      length: 5,
      unix_time: 1773412200,
      date_time_format: "wdT",
    };

    assertEquals(isEntitySimilar(entity, same), true);
    assertEquals(isEntitySimilar(entity, differentUnixTime), false);
    assertEquals(isEntitySimilar(entity, differentFormat), false);
  });

  it("isEntityEqual and isEntitiesEqual distinguish date_time metadata", () => {
    const entity: MessageEntity = {
      type: "date_time",
      offset: 0,
      length: 5,
      unix_time: 1773412200,
      date_time_format: "DT",
    };
    const same: MessageEntity = {
      type: "date_time",
      offset: 0,
      length: 5,
      unix_time: 1773412200,
      date_time_format: "DT",
    };
    const different: MessageEntity = {
      type: "date_time",
      offset: 0,
      length: 5,
      unix_time: 1773412200,
      date_time_format: "wdT",
    };

    assertEquals(isEntityEqual(entity, same), true);
    assertEquals(isEntityEqual(entity, different), false);
    assertEquals(isEntitiesEqual([entity], [same]), true);
    assertEquals(isEntitiesEqual([entity], [different]), false);
  });

  it("consolidates only matching date_time entities", () => {
    const left: MessageEntity = {
      type: "date_time",
      offset: 0,
      length: 4,
      unix_time: 1773412200,
      date_time_format: "DT",
    };
    const adjacentSame: MessageEntity = {
      type: "date_time",
      offset: 4,
      length: 3,
      unix_time: 1773412200,
      date_time_format: "DT",
    };
    const adjacentDifferent: MessageEntity = {
      type: "date_time",
      offset: 7,
      length: 2,
      unix_time: 1773412200,
      date_time_format: "wdT",
    };

    assertEquals(canConsolidateEntities(left, adjacentSame), true);
    assertEquals(canConsolidateEntities(left, adjacentDifferent), false);

    const consolidated = consolidateEntities([
      adjacentDifferent,
      adjacentSame,
      left,
    ]);

    assertEquals(consolidated.length, 2);
    assertEquals(consolidated[0], {
      type: "date_time",
      offset: 0,
      length: 7,
      unix_time: 1773412200,
      date_time_format: "DT",
    });
    assertEquals(consolidated[1], adjacentDifferent);
  });
});
