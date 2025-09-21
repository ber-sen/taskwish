import { Expect, Equal } from "./utils/helper-types";
import { Action } from "./action";
import { Env } from "./utils/env";
import { ArkErrors } from "arktype";
import { Meta } from "./utils/meta";
import { Exception } from "./utils/exception";

describe("Action", () => {
  it("works with generators", () => {
    const action = Action(async function* () {
      const env = yield* Env({ DATABASE_API_KEY: "string" });

      return { env };
    });

    type T = typeof action;

    type action = Expect<
      Equal<
        T,
        Action<
          [],
          | Exception<{
              readonly status: 400;
              readonly errors: ArkErrors;
            }>
          | Meta<{
              type: "requires";
              requires: "ctx";
              data: {
                DATABASE_API_KEY: string;
              };
            }>,
          {
            env:
              | {
                  DATABASE_API_KEY: string;
                }
              | undefined;
          },
          Record<
            "env",
            {
              DATABASE_API_KEY: string;
            }
          >
        >
      >
    >;
  });
});
