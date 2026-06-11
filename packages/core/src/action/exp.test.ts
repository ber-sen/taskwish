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
          const selected = this.exp("$.input.items[1].name");

          type check = Expect<Equal<typeof selected, string>>;

          return selected;
        }),
      );

    type check = Expect<
      Equal<Awaited<ReturnType<typeof selectItem>>, string>
    >;

    await expect(
      selectItem({ items: [{ name: "first" }, { name: "second" }] }),
    ).resolves.toBe("second");
  });

  test("evaluates array slices with steps", async () => {
    const { selectItems } = Action("selectItems")
      .input({ items: [{ name: "string" }, "[]"] })

      .run(
        Step("selected", function () {
          const selected = this.exp("$.input.items[1:5:2].name");

          type check = Expect<Equal<typeof selected, string[]>>;

          return selected;
        }),
      );

    type check = Expect<
      Equal<Awaited<ReturnType<typeof selectItems>>, string[]>
    >;

    await expect(
      selectItems({
        items: [
          { name: "zero" },
          { name: "one" },
          { name: "two" },
          { name: "three" },
          { name: "four" },
          { name: "five" },
        ],
      }),
    ).resolves.toEqual(["one", "three"]);
  });

  test("supports omitted and negative slice values", async () => {
    const { selectItems } = Action("selectItems")
      .input({ items: ["string", "[]"] })

      .run(
        Step("selected", function () {
          return {
            everyOther: this.exp("$.input.items[::2]"),
            reversed: this.exp("$.input.items[::-1]"),
            withoutEnds: this.exp("$.input.items[1:-1]"),
          };
        }),
      );

    await expect(
      selectItems({ items: ["zero", "one", "two", "three", "four"] }),
    ).resolves.toEqual({
      everyOther: ["zero", "two", "four"],
      reversed: ["four", "three", "two", "one", "zero"],
      withoutEnds: ["one", "two", "three"],
    });
  });

  test("rejects zero slice steps", async () => {
    const { invalidSlice } = Action("invalidSlice")
      .input({ items: ["string", "[]"] })

      .run(
        Step("selected", function () {
          return this.exp("$.input.items[::0]");
        }),
      );

    await expect(
      invalidSlice({ items: ["one", "two"] }),
    ).rejects.toBeInstanceOf(JSONPathSyntaxError);
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

  test("excludes functions from expression paths", async () => {
    const { notify } = Action("notify")
      .input({ message: "string" })

      .run(function () {
        return this.input.message;
      });

    const { inspect } = Action("inspect")
      .use(notify)

      .run(
        Step("provider", function () {
          return {
            name: "catalog",
            execute() {
              return "done";
            },
          };
        }),
        Step("selected", function () {
          const name = this.exp("$.provider.name");
          const root = this.exp("$");

          if (false) {
            // @ts-expect-error scope functions are not expression values
            this.exp("$.thread.reply");
            // @ts-expect-error actions are excluded from expression scope
            this.exp("$.actions");
            // @ts-expect-error functions returned by steps are excluded
            this.exp("$.provider.execute");
          }

          return { name, hasActions: "actions" in root };
        }),
      );

    await expect(inspect()).resolves.toEqual({
      name: "catalog",
      hasActions: false,
    });
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
    const { saveCatalog } = Action("saveCatalog")
      .input({
        items: [{ title: "string", enabled: "boolean" }, "[]"],
      })

      .run(function () {
        return this.input.items.length;
      });

    const { summarize } = Action("summarize")
      .use(InferType())

      .use(saveCatalog)

      .input({
        items: [{ name: "string", active: "boolean" }, "[]"],
      })

      .run(
        Step("reply", function () {
          return this.actions.saveCatalog({
            items: this.exp("$.input.items[*]", {
              title: "@.name",
              enabled: "@.active",
            }),
          });
        }),
      );

    expect(summarize.run[0]).toMatchObject({
      $: "saveCatalog",
      "=": "reply",
      items:
        '{$.input.items[*] | {"title":"@.name","enabled":"@.active"}}',
    });
  });
});
