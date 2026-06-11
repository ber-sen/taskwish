import { describe, expect, test } from "bun:test";
import { ParseError, ValidationError } from "@gabrielbryk/jq-ts";
import { Equal, Expect } from "../helpers";
import { Step } from "../steps";
import { InferType } from "../use";
import { Action } from "./action";

describe("exp", () => {
  test("evaluates input paths and jq expressions in an action", async () => {
    const { selectItems } = Action("selectItems")
      .input({
        items: [{ name: "string", active: "boolean" }, "[]"],
      })
      
      .run(
        Step("selected", function () {
          const firstName = this.exp(".input.items[].name");
          const activeCount = this.exp<number>(
            "[.input.items[] | select(.active)] | length",
          );

          type check = Expect<Equal<typeof firstName, string>>;

          return { firstName, activeCount };
        }),
      );

    await expect(
      selectItems({
        items: [
          { name: "first", active: true },
          { name: "second", active: false },
        ],
      }),
    ).resolves.toEqual({ firstName: "first", activeCount: 1 });
  });

  test("rejects invalid jq expressions in an action", async () => {
    const { invalidExpression } = Action("invalidExpression").run(
      Step("selected", function () {
        return this.exp(".input[");
      }),
    );

    await expect(invalidExpression()).rejects.toBeInstanceOf(ParseError);
  });

  test("rejects unsupported jq expressions in an action", async () => {
    const { unsupportedExpression } = Action("unsupportedExpression").run(
      Step("selected", function () {
        return this.exp("unknown_builtin(.)");
      }),
    );

    await expect(unsupportedExpression()).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  test("supports inferred and explicit result types in an action", async () => {
    const { inspectInput } = Action("inspectInput")
      .input({
        name: "string",
        items: "string[]",
        active: "boolean",
      })
      .run(
        Step("selected", function () {
          const inferredName = this.exp(".input.name");
          const explicitName = this.exp<string>(".input.name");
          const count = this.exp<number>(".input.items | length");
          const active = this.exp<boolean>(".input.active");

          type check = Expect<Equal<typeof inferredName, string>>;

          return { inferredName, explicitName, count, active };
        }),
      );

    await expect(
      inspectInput({
        name: "Ada",
        items: ["one", "two"],
        active: true,
      }),
    ).resolves.toEqual({
      inferredName: "Ada",
      explicitName: "Ada",
      count: 2,
      active: true,
    });
  });

  test("evaluates against previous step results", async () => {
    const { select } = Action("select")
      .input({ name: "string" })
      .run(
        Step("upper", function () {
          return this.input.name.toUpperCase();
        }),
        Step("selected", function () {
          return this.exp(".upper");
        }),
      );

    await expect(select({ name: "Ada" })).resolves.toBe("ADA");
  });

  test("validates this.exp while defining action steps", () => {
    const { summarize } = Action("summarize")
      .use(InferType())
      .input({ items: [{ active: "boolean" }] })
      .run(
        Step("reply", function () {
          return this.actions.generateText({
            model: "gpt5",
            prompt: this.exp<string>(
              "[.input.items[] | select(.active)] | length",
            ),
          });
        }),
      );

    expect(summarize.run[0]).toMatchObject({
      $: "generateText",
      "=": "reply",
      prompt: "*{[.input.items[] | select(.active)] | length}",
    });
  });
});
