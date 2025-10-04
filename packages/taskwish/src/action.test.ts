import { Expect, Equal } from "./helper-types";
import { Action } from "./action";
import { Env } from "./utils/env";
import { ArkErrors } from "arktype";
import { TaskWish } from "./types";

describe("Action", () => {
  it("works with arrow functions", async () => {
    const action = Action(() => ({ success: true }));

    type T = typeof action;

    type action = Expect<
      Equal<
        TaskWish.Runnable<
          never,
          {
            success: boolean;
          },
          unknown
        >,
        T
      >
    >;

    const result = await action.run();

    expect(result).toEqual({ success: true });
  });

  it("works with params", async () => {
    const action = Action((params: { language: string }) => {
      return params.language;
    });

    type T = typeof action;

    type action = Expect<
      Equal<
        TaskWish.Action<
          {
            language: string;
          },
          never,
          string,
          unknown
        >,
        T
      >
    >;

    const result = await action.run({ language: "Spanish" });

    expect(result).toEqual("Spanish");
  });

  it("works with generators", () => {
    const action = Action(async function* () {
      const env = yield* Env({ DATABASE_API_KEY: "string" });

      return { env };
    });

    type T = typeof action;

    type action = Expect<
      Equal<
        T,
        TaskWish.Runnable<
          | TaskWish.Exception<{
              readonly status: 400;
              readonly errors: ArkErrors;
            }>
          | TaskWish.Meta<{
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
