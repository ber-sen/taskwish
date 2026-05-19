import { expect, test, describe } from "bun:test";
import { Expect, Equal } from "../helpers";
import { Action } from "../action";
import { Step } from "./step";
import { Loop } from "./loop";
import { If, Else, ElseIf } from "./if-else";

// ─── Runtime ────────────────────────────────────────────────────────────────

describe("Loop", () => {
  test("array literal as items", async () => {
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

  test("maps over input array", async () => {
    const { branch } = Action("branch")
      .input({ nums: "number[]" })

      .run(
        Loop(
          "input.nums",

          Step("doubled", function () {
            return this.loop.item * 2;
          }),
        ),
      );

    expect(await branch({ nums: [1, 2, 3] })).toEqual([2, 4, 6]);
  });

  test("exposes index alongside item — named loop variable", async () => {
    const { branch } = Action("branch").run(
      Loop(
        { name: "n", items: [10, 20, 30] },

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
        "words",

        Step("upper", function () {
          return this.loop.item.toUpperCase();
        }),
      ),
    );

    expect(await branch()).toEqual(["HELLO", "WORLD"]);
  });

  test("loop variable is not in scope after loop", async () => {
    const { branch } = Action("branch")
      .input({ items: "number[]" })

      .run(
        Loop(
          "input.items",

          Step("doubled", function () {
            return this.loop.item * 2;
          }),
        ),

        Step("check", function () {
          return "loop" in this;
        }),
      );

    expect(await branch({ items: [1, 2] })).toEqual(false);
  });

  test("accumulated array is available to subsequent steps", async () => {
    const { branch } = Action("branch")
      .input({ items: "number[]" })

      .run(
        Loop(
          "input.items",

          Step("doubled", function () {
            return this.loop.item * 2;
          }),
        ),

        Step("sum", function () {
          return (this.doubled as number[]).reduce((a, b) => a + b, 0);
        }),
      );

    expect(await branch({ items: [1, 2, 3] })).toEqual(12);
  });

  test("multiple inner steps — all accumulated as arrays in outer scope", async () => {
    const { branch } = Action("branch")
      .input({ items: "number[]" })

      .run(
        Loop(
          "input.items",

          Step("doubled", function () {
            return this.loop.item * 2;
          }),

          Step("label", function () {
            return `${this.loop.item}x2=${this.doubled}`;
          }),
        ),

        Step("summary", function () {
          type check = Expect<Equal<typeof this.doubled, number[]>>;
          type check2 = Expect<Equal<typeof this.label, string[]>>;
          return this.label;
        }),
      );

    expect(await branch({ items: [1, 2, 3] })).toEqual([
      "1x2=2",
      "2x2=4",
      "3x2=6",
    ]);
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
    const { branch } = Action("branch")
      .input({ items: "number[]" })

      .run(
        Loop(
          "input.items",

          Step("val", function () {
            return this.loop.item;
          }),
        ),
      );

    const yields: unknown[] = [];
    for await (const v of branch.stream({ items: [1, 2] })) {
      yields.push(v);
    }

    expect(yields).toEqual([
      { ">": "branch", input: { items: [1, 2] } },
      { ">": "branch.val", result: 1 },
      { ">": "branch.val", result: 2 },
      { ">": "branch", result: [1, 2] },
    ]);
  });

  // ─── Type tests ─────────────────────────────────────────────────────────

  test("type — last is array of inner step return type", () => {
    const { branch } = Action("branch")
      .input({ nums: "number[]" })

      .run(
        Loop(
          "input.nums",

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
    Action("branch")
      .input({ nums: "number[]" })

      .run(
        Loop(
          "input.nums",

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

  // ─── If inside Loop ──────────────────────────────────────────────────────

  test("If inside loop filters items", async () => {
    const { branch } = Action("branch")
      .input({ items: "number[]" })

      .run(
        Loop(
          "input.items",

          If(
            (ctx) => ctx.loop.item % 2 === 0,

            Step("even", function () {
              return this.loop.item;
            }),
          ),
        ),
      );

    expect(await branch({ items: [1, 2, 3, 4] })).toEqual([2, 4]);
  });

  test("If/Else inside loop tags every item", async () => {
    const { branch } = Action("branch")
      .input({ items: "number[]" })

      .run(
        Loop(
          "input.items",

          If(
            (ctx) => ctx.loop.item % 2 !== 0,

            Step("tag", function () {
              return `odd:${this.loop.item}`;
            }),
          ),

          Else(
            Step("tag", function () {
              return `even:${this.loop.item}`;
            }),
          ),
        ),
      );

    expect(await branch({ items: [1, 2, 3] })).toEqual([
      "odd:1",
      "even:2",
      "odd:3",
    ]);
  });

  test("If condition inside loop accesses outer scope", async () => {
    const { branch } = Action("branch")
      .input({ items: "number[]", threshold: "number" })

      .run(
        Loop(
          "input.items",

          If(
            (ctx) => ctx.loop.item > ctx.input.threshold,

            Step("big", function () {
              return this.loop.item;
            }),
          ),
        ),
      );

    expect(await branch({ items: [1, 2, 3, 4, 5], threshold: 3 })).toEqual([
      4, 5,
    ]);
  });

  test("ElseIf inside loop — three-way branch per item", async () => {
    const { branch } = Action("branch")
      .input({ items: "number[]" })

      .run(
        Loop(
          "input.items",

          If(
            (ctx) => ctx.loop.item % 3 === 0,

            Step("tag", function () {
              return "fizz";
            }),
          ),

          ElseIf(
            (ctx) => ctx.loop.item % 2 === 0,

            Step("tag", function () {
              return "buzz";
            }),
          ),

          Else(
            Step("tag", function () {
              return "other";
            }),
          ),
        ),
      );

    expect(await branch({ items: [1, 2, 3, 4, 5, 6] })).toEqual([
      "other",
      "buzz",
      "fizz",
      "buzz",
      "other",
      "fizz",
    ]);
  });

  // ─── Loop inside Loop ────────────────────────────────────────────────────

  test("Loop inside Loop — result is array of inner arrays", async () => {
    const { branch } = Action("branch").run(
      Loop(
        { name: "outer", items: [1, 2] },

        Loop(
          { name: "inner", items: [10, 20] },

          Step("product", function () {
            return this.outer.item * this.inner.item;
          }),
        ),
      ),
    );

    expect(await branch()).toEqual([
      [10, 20],
      [20, 40],
    ]);
  });

  test("Loop inside Loop — inner accumulated key available after outer", async () => {
    const { branch } = Action("branch").run(
      Loop(
        { name: "outer", items: ["a", "b"] },

        Loop(
          { name: "inner", items: [1, 2, 3] },

          Step("tagged", function () {
            return `${this.outer.item}${this.inner.item}`;
          }),
        ),
      ),

      Step("flat", function () {
        return (this.tagged as string[][]).flat();
      }),
    );

    expect(await branch()).toEqual(["a1", "a2", "a3", "b1", "b2", "b3"]);
  });

  test("Loop inside Loop — If inside inner loop still filters", async () => {
    const { branch } = Action("branch")
      .input({ inner: "number[]" })

      .run(
        Loop(
          { name: "outer", items: [2, 3] },

          Loop(
            { name: "inner", items: [1, 3] },

            If(
              (ctx) => ctx.inner.item % 2 === 0,
              Step("even", function () {
                return this.outer.item * this.inner.item;
              }),
            ),
          ),
        ),
      );

    expect(await branch({ inner: [1, 2, 3, 4] })).toEqual([
      [4, 8],
      [6, 12],
    ]);
  });

  test("Loop > If > Loop — inner loop runs only for matching outer items", async () => {
    const { branch } = Action("branch")
      .input({ inner: "number[]" })

      .run(
        Loop(
          { name: "outer", items: [1, 2, 3, 4] },

          If(
            (ctx) => ctx.outer.item % 2 === 0,

            Loop(
              { name: "inner", items: "input.inner" },

              Step("product", function () {
                return this.outer.item * this.inner.item;
              }),
            ),
          ),
        ),
      );

    expect(await branch({ inner: [10, 20] })).toEqual([
      [20, 40],
      [40, 80],
    ]);
  });
});
