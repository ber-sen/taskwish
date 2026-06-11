import { describe, expect, test } from "bun:test";
import { Equal, Expect } from "../helpers";
import { Step } from "../steps";
import { InferType } from "../use";
import { Action } from "./action";
import { JSONPathSyntaxError } from "./json-path";

describe("exp", () => {
  test("evaluates JSONPath expressions in an action", async () => {
    const { selectItems } = Action("selectItems")
      .input({
        items: [{ name: "string", active: "boolean" }, "[]"],
      })

      .run(
        Step("selected", function () {
          const names = this.exp("$.input.items[*].name");
          const active = this.exp("$.input.items[*].active");

          type check = Expect<
            Equal<[typeof names, typeof active], [string[], boolean[]]>
          >;

          return { names, active };
        }),
      );

    await expect(
      selectItems({
        items: [
          { name: "first", active: true },
          { name: "second", active: false },
        ],
      }),
    ).resolves.toEqual({
      names: ["first", "second"],
      active: [true, false],
    });
  });

  test("evaluates indexed paths", async () => {
    const { selectItem } = Action("selectItem")
      .input({ items: [{ name: "string" }, "[]"] })
      .run(
        Step("selected", function () {
          return this.exp("$.input.items[1].name");
        }),
      );

    await expect(
      selectItem({ items: [{ name: "first" }, { name: "second" }] }),
    ).resolves.toBe("second");
  });

  test("maps selected values with a custom shape", async () => {
    const { selectItems } = Action("selectItems")
      .input({
        items: [{ name: "string", active: "boolean" }, "[]"],
      })
      .run(
        Step("selected", function () {
          const items = this.exp("$.input.items[*]", {
            title: "@.name",
            enabled: "@.active",
          });

          type check = Expect<
            Equal<typeof items, { title: string; enabled: boolean }[]>
          >;

          if (false) {
            // @ts-expect-error mapped paths must exist on the selected item
            this.exp("$.input.items[*]", { missing: "@.missing" });
          }

          return items;
        }),
      );

    await expect(
      selectItems({
        items: [
          { name: "first", active: true },
          { name: "second", active: false },
        ],
      }),
    ).resolves.toEqual([
      { title: "first", enabled: true },
      { title: "second", enabled: false },
    ]);
  });

  test("rejects invalid JSONPath expressions in an action", async () => {
    const { invalidExpression } = Action("invalidExpression").run(
      Step("selected", function () {
        // @ts-expect-error exp only accepts paths in the current scope
        return this.exp("$.input[");
      }),
    );

    await expect(invalidExpression()).rejects.toBeInstanceOf(
      JSONPathSyntaxError,
    );
  });

  test("event path", async () => {
    const { event } = Action("event")
      .input({})

      .run(
        Step("selected", function () {
          const names = this.exp('$.event[">"]');
          return names;
        }),
      );

    await expect(await event({})).toEqual("Command");
  });

  test("rejects special property names in dot notation", async () => {
    const { invalidEventPath } = Action("invalidEventPath")
      .input({})
      .run(
        Step("selected", function () {
          // @ts-expect-error special property names require bracket notation
          return this.exp("$.event.>");
        }),
      );

    await expect(invalidEventPath({})).rejects.toBeInstanceOf(
      JSONPathSyntaxError,
    );
  });

  test("infers result types from paths", async () => {
    const { inspectInput } = Action("inspectInput")
      .input({
        name: "string",
        items: "string[]",
        active: "boolean",
      })
      .run(
        Step("selected", function () {
          const name = this.exp("$.input.name");
          const items = this.exp("$.input.items");
          const active = this.exp("$.input.active");

          type check = Expect<
            Equal<
              [typeof name, typeof items, typeof active],
              [string, string[], boolean]
            >
          >;

          return { name, items, active };
        }),
      );

    await expect(
      inspectInput({
        name: "Ada",
        items: ["one", "two"],
        active: true,
      }),
    ).resolves.toEqual({
      name: "Ada",
      items: ["one", "two"],
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
          return this.exp("$.upper");
        }),
      );

    await expect(select({ name: "Ada" })).resolves.toBe("ADA");
  });

  test("validates this.exp while defining action steps", () => {
    const { summarize } = Action("summarize")
      .use(InferType())

      .input({ message: "string" })

      .run(
        Step("reply", function () {
          return this.actions.generateText({
            model: "gpt5",
            prompt: this.exp("$.input.message"),
          });
        }),
      );

    expect(summarize.run[0]).toMatchObject({
      $: "generateText",
      "=": "reply",
      prompt: "{$.input.message}",
    });
  });

  test("serializes mapped expressions while defining action steps", () => {
    const { summarize } = Action("summarize")
      .use(InferType())

      .input({
        items: [{ name: "string", active: "boolean" }, "[]"],
      })

      .run(
        Step("reply", function () {
          return this.actions.generateText({
            model: "gpt5",
            prompt: this.exp("$.input.items[*]", {
              title: "@.name",
              enabled: "@.active",
            }) as unknown as string,
          });
        }),
      );

    expect(summarize.run[0]).toMatchObject({
      $: "generateText",
      "=": "reply",
      prompt:
        '{$.input.items[*] | {"title":"@.name","enabled":"@.active"}}',
    });
  });
});
