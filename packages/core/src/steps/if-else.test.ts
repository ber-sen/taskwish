import { expect, test, describe } from "bun:test";
import { Expect, Equal } from "../helpers";
import { Action } from "../action";
import { Step } from "./step";
import { If, Else, ElseIf } from "./if-else";
import { Loop } from "./loop";

// ─── Runtime ────────────────────────────────────────────────────────────────

describe("If / Else", () => {
  test("runs if-step when condition is true", async () => {
    const { branch } = Action("branch").run(
      If(
        () => true,

        Step("result", function () {
          return "truthy";
        }),
      ),

      Else(
        Step("result", function () {
          return "falsy";
        }),
      ),
    );

    expect(await branch()).toEqual("truthy");
  });

  test("runs else-step when condition is false", async () => {
    const { branch } = Action("branch").run(
      If(
        () => false,

        Step("result", function () {
          return "truthy";
        }),
      ),

      Else(
        Step("result", function () {
          return "falsy";
        }),
      ),
    );

    expect(await branch()).toEqual("falsy");
  });

  test("skips if-step silently when condition is false and no Else", async () => {
    const { branch } = Action("branch").run(
      Step("before", function () {
        return 1;
      }),

      If(
        () => false,

        Step("skipped", function () {
          return 99;
        }),
      ),

      Step("after", function () {
        return this.before;
      }),
    );

    expect(await branch()).toEqual(1);
  });

  test("inner step accesses outer scope", async () => {
    const { branch } = Action("branch")
      .input({ value: "number" })

      .run(
        Step("doubled", function () {
          return this.input.value * 2;
        }),

        If(
          () => true,

          Step("result", function () {
            return this.doubled > 0;
          }),
        ),
      );

    expect(await branch({ value: 3 })).toEqual(true);
  });

  test("stream yields inner step events", async () => {
    const { branch } = Action("branch").run(
      If(
        () => true,

        Step("check", function () {
          return 42;
        }),
      ),
    );

    const yields: unknown[] = [];
    for await (const v of branch.stream()) {
      yields.push(v);
    }

    expect(yields).toEqual([
      { ">": "branch", input: undefined },
      { ">": "branch.check", result: 42 },
      { ">": "branch", result: 42 },
    ]);
  });

  test("stream — else-step emitted when condition is false", async () => {
    const { branch } = Action("branch").run(
      If(
        () => false,

        Step("check", function () {
          return "if";
        }),
      ),

      Else(
        Step("check", function () {
          return "else";
        }),
      ),
    );

    const yields: unknown[] = [];
    for await (const v of branch.stream()) {
      yields.push(v);
    }

    expect(yields).toEqual([
      { ">": "branch", input: undefined },
      { ">": "branch.check", result: "else" },
      { ">": "branch", result: "else" },
    ]);
  });

  test("condition receives scope", async () => {
    const { branch } = Action("branch")
      .input({ x: "number" })

      .run(
        If(
          (ctx) => ctx.input.x > 10,

          Step("result", function () {
            return "big";
          }),
        ),

        Else(
          Step("result", function () {
            return "small";
          }),
        ),
      );

    expect(await branch({ x: 5 })).toEqual("small");
    expect(await branch({ x: 20 })).toEqual("big");
  });

  test("runs else-if step when if is false and else-if is true", async () => {
    const { branch } = Action("branch")
      .input({ x: "number" })

      .run(
        If(
          (ctx) => ctx.input.x > 10,
          Step("result", function () { return "big"; }),
        ),

        ElseIf(
          (ctx) => ctx.input.x > 5,
          Step("result", function () { return "medium"; }),
        ),

        Else(
          Step("result", function () { return "small"; }),
        ),
      );

    expect(await branch({ x: 20 })).toEqual("big");
    expect(await branch({ x: 7 })).toEqual("medium");
    expect(await branch({ x: 2 })).toEqual("small");
  });

  // ─── Type tests ─────────────────────────────────────────────────────────

  test("type — after If, added scope key is optional", () => {
    const { branch } = Action("branch").run(
      If(
        () => true as boolean,

        Step("check", function () {
          return 42 as number;
        }),
      ),
    );

    type T = typeof branch;
    type RetVal = Awaited<ReturnType<T>>;

    // branch returns the last value: number | undefined (If might not run)
    type check = Expect<Equal<RetVal, number | undefined>>;
  });

  test("type — after If + Else same key, return is required union", () => {
    const { branch } = Action("branch").run(
      If(
        () => true,

        Step("check", function () {
          return "yes" as const;
        }),
      ),

      Else(
        Step("check", function () {
          return "no" as const;
        }),
      ),
    );

    type T = typeof branch;
    type RetVal = Awaited<ReturnType<T>>;

    // Both branches always produce a value — result is "yes" | "no"
    type check = Expect<Equal<RetVal, "yes" | "no">>;
  });

  test("type — If + ElseIf + Else produces required three-way union", () => {
    const { branch } = Action("branch").run(
      If(
        () => true as boolean,
        Step("result", function () { return "a" as const; }),
      ),

      ElseIf(
        () => true as boolean,
        Step("result", function () { return "b" as const; }),
      ),

      Else(
        Step("result", function () { return "c" as const; }),
      ),
    );

    type T = typeof branch;
    type RetVal = Awaited<ReturnType<T>>;

    type check = Expect<Equal<RetVal, "a" | "b" | "c">>;
  });

  test("type — If + ElseIf without Else is optional union", () => {
    const { branch } = Action("branch").run(
      If(
        () => true as boolean,
        Step("result", function () { return "a" as const; }),
      ),

      ElseIf(
        () => true as boolean,
        Step("result", function () { return "b" as const; }),
      ),
    );

    type T = typeof branch;
    type RetVal = Awaited<ReturnType<T>>;

    type check = Expect<Equal<RetVal, "a" | "b" | undefined>>;
  });

  // ─── Loop inside If ──────────────────────────────────────────────────────

  test("Loop inside If runs when condition is true", async () => {
    const { branch } = Action("branch").run(
      If(
        () => true,
        Loop(
          [1, 2, 3],
          Step("val", function () { return this.loop.item * 2; }),
        ),
      ),
    );

    expect(await branch()).toEqual([2, 4, 6]);
  });

  test("Loop inside If skipped when condition is false", async () => {
    const { branch } = Action("branch").run(
      Step("before", function () { return 99; }),

      If(
        () => false,
        Loop(
          [1, 2, 3],
          Step("val", function () { return this.loop.item; }),
        ),
      ),

      Step("after", function () { return this.before; }),
    );

    expect(await branch()).toEqual(99);
  });

  test("Loop inside Else runs when condition is false", async () => {
    const { branch } = Action("branch").run(
      If(
        () => false,
        Step("result", function () { return "if-branch"; }),
      ),

      Else(
        Loop(
          [10, 20],
          Step("result", function () { return this.loop.item; }),
        ),
      ),
    );

    expect(await branch()).toEqual([10, 20]);
  });

  test("Loop accumulated result available after If", async () => {
    const { branch } = Action("branch").run(
      If(
        () => true,
        Loop(
          [1, 2, 3],
          Step("doubled", function () { return this.loop.item * 2; }),
        ),
      ),

      Step("sum", function () {
        return (this.doubled as number[]).reduce((a, b) => a + b, 0);
      }),
    );

    expect(await branch()).toEqual(12);
  });

  // ─── If inside If ────────────────────────────────────────────────────────

  test("If inside If — both true runs inner step", async () => {
    const { branch } = Action("branch").run(
      If(
        () => true,
        If(
          () => true,
          Step("result", function () { return "both"; }),
        ),
      ),
    );

    expect(await branch()).toEqual("both");
  });

  test("If inside If — inner false skips inner step", async () => {
    const { branch } = Action("branch").run(
      Step("before", function () { return 1; }),

      If(
        () => true,
        If(
          () => false,
          Step("result", function () { return "inner"; }),
        ),
      ),

      Step("after", function () { return this.before; }),
    );

    expect(await branch()).toEqual(1);
  });

  test("If inside If — outer false skips both", async () => {
    const { branch } = Action("branch").run(
      Step("before", function () { return 42; }),

      If(
        () => false,
        If(
          () => true,
          Step("result", function () { return "inner"; }),
        ),
      ),

      Step("after", function () { return this.before; }),
    );

    expect(await branch()).toEqual(42);
  });

  test("If inside If — condition receives scope at both levels", async () => {
    const { branch } = Action("branch")
      .input({ x: "number" })

      .run(
        If(
          ctx => ctx.input.x > 0,
          If(
            ctx => ctx.input.x > 10,
            Step("result", function () { return "big"; }),
          ),
        ),

        Else(
          Step("result", function () { return "negative"; }),
        ),

        Step("out", function () {
          return (this as any).result ?? "small";
        }),
      );

    expect(await branch({ x: -1 })).toEqual("negative");
    expect(await branch({ x: 5 })).toEqual("small");
    expect(await branch({ x: 20 })).toEqual("big");
  });
});
