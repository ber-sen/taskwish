/* oxlint-disable no-unused-vars -- Compile-time assertions intentionally have no runtime use. */

import { describe, test } from "bun:test";
import { Expect, Equal } from "./helpers";
import { TW } from "./core";
import { Struct } from "./struct";

describe("Struct", () => {
  test("single def — object schema", () => {
    const { Person } = Struct("Person", { name: "string", age: "number" });

    type T = typeof Person;
    type check = Expect<
      Equal<
        T,
        TW.Struct<
          "Person",
          {
            name: string;
            age: number;
          }
        >
      >
    >;
  });

  test("tuple spread — union", () => {
    const { Return } = Struct("Return", { data: { name: "string" } }, "|", {
      error: { message: "string" },
    });

    type T = typeof Return;
    type check = Expect<
      Equal<
        T,
        TW.Struct<
          "Return",
          | {
              data: {
                name: string;
              };
            }
          | {
              error: {
                message: string;
              };
            }
        >
      >
    >;
  });
});
