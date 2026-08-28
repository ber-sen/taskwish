import { describe, expect, test } from "bun:test";
import { $ } from "@taskwish/expr";

import { consoleConfig } from "./server";

describe("console config", () => {
  test("converts expression metadata to CEL before JSON transport", () => {
    const action = (() => undefined) as (() => undefined) &
      Record<symbol, unknown>;
    action[Symbol.for("TW.Meta")] = {
      input: {
        id: {
          suggestions: {
            $: "todos.listTodos",
            "*": $.filter((item) => !item.done).map((item) => ({
              value: item.id,
              label: item.description,
            })),
          },
        },
      },
    };

    const config = consoleConfig(
      {
        actions: new Map([["Todos::markTodoDone", action]]),
        states: new Map(),
      },
      { nodeName: "Test", apiKey: "test", prefix: "/tw" },
    );
    const suggestions = config.actions[0]!.input[0]!.metadata!
      .suggestions as Record<string, unknown>;

    expect(suggestions["*"]).toBe(
      'result.filter(item, !item.done).map(item, {"value": item.id, "label": item.description})',
    );
    expect(JSON.parse(JSON.stringify(config)).actions[0].input[0].metadata)
      .toEqual({
        suggestions: {
          $: "todos.listTodos",
          "*":
            'result.filter(item, !item.done).map(item, {"value": item.id, "label": item.description})',
        },
      });
  });
});
