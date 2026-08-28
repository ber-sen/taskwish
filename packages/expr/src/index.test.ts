import { describe, expect, test } from "bun:test";

import { $, evaluateCEL, ToCEL, ToFn } from "./index";

const todos = [
  { id: "todo-1", description: "Write docs", done: false },
  { id: "todo-2", description: "Ship release", done: true },
];

describe("CEL expressions", () => {
  test("builds CEL paths through the root proxy", () => {
    const expression = $.payload.deep.items;

    expect(expression[ToCEL]()).toBe("result.payload.deep.items");
    expect(
      (expression as unknown as { toJSON?: unknown }).toJSON,
    ).toBeUndefined();
    expect(expression[ToFn]({ payload: { deep: { items: todos } } })).toBe(
      todos,
    );
    expect(
      evaluateCEL(expression[ToCEL](), {
        payload: { deep: { items: todos } },
      }),
    ).toBe(todos);
  });

  test("converts filter/map callbacks to CEL list macros", () => {
    const expression = $.filter((item) => !item.done).map((item) => ({
      value: item.id,
      label: item.description,
    }));

    expect(expression[ToCEL]()).toBe(
      'result.filter(item, !item.done).map(item, {"value": item.id, "label": item.description})',
    );
    expect(expression[ToFn](todos)).toEqual([
      { value: "todo-1", label: "Write docs" },
    ]);
    expect(evaluateCEL(expression[ToCEL](), todos)).toEqual([
      { value: "todo-1", label: "Write docs" },
    ]);
  });

  test("converts JavaScript equality to CEL equality", () => {
    const expression = $.payload.todos
      .filter(function (todo) {
        return todo.done === false;
      })
      .map((todo) => ({ value: todo.id, label: todo.description }));

    expect(expression[ToCEL]()).toBe(
      'result.payload.todos.filter(todo, todo.done == false).map(todo, {"value": todo.id, "label": todo.description})',
    );
    expect(evaluateCEL(expression[ToCEL](), { payload: { todos } })).toEqual([
      { value: "todo-1", label: "Write docs" },
    ]);
  });

  test("evaluates CEL strings without a proxy instance", () => {
    expect(evaluateCEL("result.filter(todo, !todo.done)", todos)).toEqual([
      todos[0],
    ]);
  });
});
