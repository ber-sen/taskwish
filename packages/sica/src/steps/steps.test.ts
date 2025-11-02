import { End } from "./end";
import { If } from "./if-else";
import { Input } from "./input";
import { Loop, Range } from "./loop";
import { Match } from "./match";
import { Steps } from "./steps";

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
});
