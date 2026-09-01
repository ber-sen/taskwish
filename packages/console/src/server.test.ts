import { describe, expect, test } from "bun:test";
import { $ } from "@taskwish/expr";

import { consoleConfig } from "./server";

describe("console config", () => {
  test("formats action names as sentence case", () => {
    const action = (() => undefined) as () => undefined;
    const config = consoleConfig(
      {
        actions: new Map([["Todos::addTodo", action]]),
        states: new Map(),
      },
      { nodeName: "Test", apiKey: "test", prefix: "/tw" },
    );

    expect(config.actions[0]!.label).toBe("Add todo");
    expect(config.mcp).toEqual({
      enabled: true,
      endpoints: [
        {
          path: "/actor",
          tools: [
            {
              name: "Todos.addTodo",
              action: "Todos::addTodo",
              description: "Invoke Todos::addTodo",
            },
          ],
        },
      ],
    });
  });

  test("describes disabled and custom MCP endpoints", () => {
    const add = (() => undefined) as () => undefined;
    const remove = (() => undefined) as () => undefined;
    const registry = {
      actions: new Map([
        ["Todos::add", add],
        ["Todos::remove", remove],
      ]),
      states: new Map(),
    };

    expect(
      consoleConfig(registry, {
        nodeName: "Test",
        apiKey: "test",
        prefix: "/tw",
        mcp: false,
      }).mcp,
    ).toEqual({ enabled: false, endpoints: [] });

    expect(
      consoleConfig(registry, {
        nodeName: "Test",
        apiKey: "test",
        prefix: "/tw",
        mcp: { path: "todos/", tools: [remove] },
      }).mcp,
    ).toEqual({
      enabled: true,
      endpoints: [
        {
          path: "/todos",
          tools: [
            {
              name: "Todos.remove",
              action: "Todos::remove",
              description: "Invoke Todos::remove",
            },
          ],
        },
      ],
    });
  });

  test("converts expression metadata to CEL before JSON transport", () => {
    const action = (() => undefined) as (() => undefined) &
      Record<symbol, unknown>;
    action[Symbol.for("TW.Meta")] = {
      input: {
        id: {
          suggestions: {
            $: "Todos::listTodos",
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

    expect(config.actions[0]!.id).toBe("Todos::markTodoDone");
    expect(config.actions[0]!.route).toBe("/tw/Todos/mark-todo-done");
    expect(suggestions["*"]).toBe(
      'result.filter(item, !item.done).map(item, {"value": item.id, "label": item.description})',
    );
    expect(JSON.parse(JSON.stringify(config)).actions[0].input[0].metadata)
      .toEqual({
        suggestions: {
          $: "Todos::listTodos",
          "*":
            'result.filter(item, !item.done).map(item, {"value": item.id, "label": item.description})',
        },
      });
  });
});
