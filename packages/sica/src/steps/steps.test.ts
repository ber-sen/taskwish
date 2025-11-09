import { Equal, Name } from "drizzle-orm";
import { Sica } from "../types";
import { End } from "./end";
import { If } from "./if-else";
import { Input } from "./input";
import { Loop, Range } from "./loop";
import { Match } from "./match";
import { Steps } from "./steps";
import { Expect } from "../helpers";

describe("Steps", () => {
  it("works for two steps", async () => {
    const result = Steps(["step 1", () => 3], ["step 2", ($) => 3]);

    expect(result).toEqual({ success: true });
  });

  it("should let steps inside a condition access the values before it", async () => {
    const result = Steps(
      ["step 1", () => 3],

      If(2 > 1),

      ["asdasd", ({ step1 }) => step1],

      End(If)
    );

    expect(result).toEqual({ success: true });
  });

  it("should properly type steps inside condition with optional values", async () => {
    const result = Steps(
      If(2 > 1),

      ["condition step", ($) => $.condition],

      End(If),

      ["end", ($) => $.conditionStep]
    );

    expect(result).toEqual({ success: true });
  });

  it("should return loop value as array", async () => {
    const result = Steps(
      Loop(Range(0, 10)),

      ["loop step", ($) => $.loop.value],

      End(Loop),

      ["end", ($) => $.loopStep]
    );

    expect(result).toEqual({ success: true });
  });

  it("should work as action", async () => {
    const action = Steps(
      Input({ language: "string" }),

      ["end", ($) => $.input.language]
    );

    const result = action({ language: "Spanish" });

    expect(result).toEqual({ success: true });
  });

  it("should work with match", async () => {
    const action = Steps(
      Input({ language: "string" }),

      ($) => Match($.input, { subtype: true }),

      "me_message",

      ["lorem", ($) => asdad],

      "bot_message",

      ["ipsum", ($) => asdad],

      End(Match)
    );

    const result = action({ language: "Spanish" });

    expect(result).toEqual({ success: true });
  });

  it("should work with match", async () => {
    const Step = <const Name extends string, const R>(
      name: Name,
      data: R
    ): Sica.Step<Name, R, null> => ({}) as never;

    const steps = async function* () {
      yield Step("1", 3);
      yield Step("2", "sadasd");
      yield Step("3", true);
      yield Step("4", 3);
      yield Step("5", "sadasd");
      yield Step("6", true);
      yield Step("7", 3);
      yield Step("8", "sadasd");
      yield Step("9", true);
      yield Step("10", 3);
      yield Step("11", "sadasd");
      yield Step("12", true);
    };

    type T = ReturnType<typeof steps>;

    type succeed = Expect<
      Equal<
        AsyncGenerator<
          | Sica.Step<"1", 3, null, ["step"]>
          | Sica.Step<"2", "sadasd", null, ["step"]>
          | Sica.Step<"3", true, null, ["step"]>
          | Sica.Step<"4", 3, null, ["step"]>
          | Sica.Step<"5", "sadasd", null, ["step"]>
          | Sica.Step<"6", true, null, ["step"]>
          | Sica.Step<"7", 3, null, ["step"]>
          | Sica.Step<"8", "sadasd", null, ["step"]>
          | Sica.Step<"9", true, null, ["step"]>
          | Sica.Step<"10", 3, null, ["step"]>
          | Sica.Step<"11", "sadasd", null, ["step"]>
          | Sica.Step<"12", true, null, ["step"]>,
          void,
          unknown
        >,
        T
      >
    >;

    expect(result).toEqual({ success: true });
  });
});
