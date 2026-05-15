import { expect, test, describe } from "bun:test";
import { Expect, Equal } from "../helpers";
import { Action } from "../action";
import { Step } from "./step";
import { Loop } from "./loop";
import { Steps } from "./steps";

// ─── Runtime ────────────────────────────────────────────────────────────────

describe("Loop", () => {
  test("maps over a static array", async () => {
    const { branch } = Action("branch").run(
      Loop(
        [1, 2, 3],

        Step("doubled", function () {
          return this.loop.item * 2;
        }),
      ),
    );

    expect(await branch()).toEqual([2, 4, 6]);
  });

  test("exposes index alongside item — named loop variable", async () => {
    const { branch } = Action("branch").run(
      Loop(
        "n",
        [10, 20, 30],

        Step("tagged", function () {
          return `${this.n.index}:${this.n.item}`;
        }),
      ),
    );

    expect(await branch()).toEqual(["0:10", "1:20", "2:30"]);
  });

  test("empty array produces empty result", async () => {
    const { branch } = Action("branch").run(
      Loop(
        [],

        Step("result", function () {
          return this.loop.item;
        }),
      ),
    );

    expect(await branch()).toEqual([]);
  });

  test("inner step accesses outer scope", async () => {
    const { branch } = Action("branch")
      .input({ factor: "number" })

      .run(
        Loop(
          [10, 20, 30],

          Step("scaled", function () {
            return this.loop.item * this.input.factor;
          }),
        ),
      );

    expect(await branch({ factor: 3 })).toEqual([30, 60, 90]);
  });

  test("items getter receives outer scope", async () => {
    const { branch } = Action("branch").run(
      Step("words", function () {
        return ["hello", "world"];
      }),

      Loop(
        ctx => ctx.words,
        
        Step("upper", function () {
          return this.loop.item.toUpperCase();
        }),
      ),
    );

    expect(await branch()).toEqual(["HELLO", "WORLD"]);
  });

  test("loop variable is not in scope after loop", async () => {
    const { branch } = Action("branch").run(
      Loop(
        [1, 2],
        
        Step("doubled", function () {
          return this.loop.item * 2;
        }),
      ),

      Step("check", function () {
        return "loop" in this;
      }),
    );

    expect(await branch()).toEqual(false);
  });

  test("accumulated array is available to subsequent steps", async () => {
    const { branch } = Action("branch").run(
      Loop(
        [1, 2, 3],

        Step("doubled", function () {
          return this.loop.item * 2;
        }),
      ),

      Step("sum", function () {
        return (this.doubled as number[]).reduce((a, b) => a + b, 0);
      }),
    );

    expect(await branch()).toEqual(12);
  });

  test("multiple inner steps — all accumulated as arrays in outer scope", async () => {
    const { branch } = Action("branch").run(
      Loop([1, 2, 3],
        Step("doubled", function () { return this.loop.item * 2; }),
        Step("label", function () { return `${this.loop.item}x2=${this.doubled}`; }),
      ),

      Step("summary", function () {
        type check = Expect<Equal<typeof this.doubled, number[]>>;
        type check2 = Expect<Equal<typeof this.label, string[]>>;
        return this.label;
      }),
    );

    expect(await branch()).toEqual(["1x2=2", "2x2=4", "3x2=6"]);
  });

  test("inner steps composed with Steps(...)", async () => {
    const { branch } = Action("branch").run(
      Loop([1, 2, 3],
        Steps(
          Step("doubled", function () { return this.loop.item * 2; }),
          Step("label", function () { return `${this.loop.item}x2=${this.doubled}`; }),
        ),
      ),

      Step("summary", function () {
        return this.label;
      }),
    );

    expect(await branch()).toEqual(["1x2=2", "2x2=4", "3x2=6"]);
  });

  test("Loop.Range generates a numeric sequence", async () => {
    const { branch } = Action("branch").run(
      Loop(
        Loop.Range(0, 4),

        Step("squared", function () {
          return this.loop.item ** 2;
        }),
      ),
    );

    expect(await branch()).toEqual([0, 1, 4, 9]);
  });

  test("stream yields one event per iteration", async () => {
    const { branch } = Action("branch").run(
      Loop(
        [1, 2],

        Step("val", function () {
          return this.loop.item;
        }),
      ),
    );

    const yields: unknown[] = [];
    for await (const v of branch.stream()) {
      yields.push(v);
    }

    expect(yields).toEqual([
      { ">": "branch", input: undefined },
      { ">": "branch.val", result: 1 },
      { ">": "branch.val", result: 2 },
      { ">": "branch", result: [1, 2] },
    ]);
  });

  // ─── Type tests ─────────────────────────────────────────────────────────

  test("type — last is array of inner step return type", () => {
    const { branch } = Action("branch").run(
      Loop(
        [1, 2, 3],

        Step("doubled", function () {
          return this.loop.item * 2;
        }),
      ),
    );

    type T = typeof branch;
    type RetVal = Awaited<ReturnType<T>>;

    type check = Expect<Equal<RetVal, number[]>>;
  });

  test("type — accumulated key in scope is array", () => {
    Action("branch").run(
      Loop(
        [1, 2, 3],

        Step("doubled", function () {
          return this.loop.item * 2;
        }),
      ),

      Step("sum", function () {
        type check = Expect<Equal<typeof this.doubled, number[]>>;
        
        return this.doubled.reduce((a, b) => a + b, 0);
      }),
    );
  });

  test("type — Loop.Range produces number items", () => {
    Action("branch").run(
      Loop(
        Loop.Range(0, 5),

        Step("squared", function () {
          type check = Expect<
            Equal<typeof this.loop, { item: number; index: number }>
          >;
          return this.loop.item ** 2;
        }),
      ),
    );
  });
});
