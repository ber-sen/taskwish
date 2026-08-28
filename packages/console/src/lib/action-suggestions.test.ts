import { describe, expect, test } from "bun:test";

import type { ConsoleAction, ConsoleInputField } from "../types";
import {
  actionResultValue,
  actionSuggestion,
  actionSuggestionOptions,
} from "./action-suggestions";

const listAction: ConsoleAction = {
  id: "Todos::list",
  actor: "Todos",
  action: "list",
  label: "List",
  route: "/api/Todos/list",
  source: "local",
  input: [],
};

const idField: ConsoleInputField = {
  name: "id",
  required: true,
  metadata: {
    suggestions: {
      $: "todos.list",
      "*":
        'result.items.filter(todo, !todo.done).map(todo, {"value": todo.id, "label": todo.description})',
    },
  },
};

describe("action suggestions", () => {
  test("resolves an injected action reference to its console action", () => {
    expect(actionSuggestion(idField, [listAction])).toEqual({
      action: listAction,
      payload: {},
      selector:
        'result.items.filter(todo, !todo.done).map(todo, {"value": todo.id, "label": todo.description})',
    });
  });

  test("maps action output to display labels and submitted IDs", () => {
    const selector = actionSuggestion(idField, [listAction])!.selector;
    expect(
      actionSuggestionOptions(
        {
          items: [
            { id: "todo-1", description: "Write docs", done: false },
            { id: "todo-2", description: "Already shipped", done: true },
            { id: "todo-3", description: "Review PR", done: false },
          ],
        },
        selector
      )
    ).toEqual([
      { label: "Write docs", value: "todo-1" },
      { label: "Review PR", value: "todo-3" },
    ]);
  });

  test("uses the final result event for streamed actions", () => {
    expect(
      actionResultValue({
        status: 200,
        ok: true,
        contentType: "text/event-stream",
        body: "",
        events: [{ type: "result", data: { items: [] } }],
      })
    ).toEqual({ items: [] });
  });

  test("uses a state event value for root-list suggestions", () => {
    expect(
      actionSuggestionOptions(
        actionResultValue({
          status: 200,
          ok: true,
          contentType: "text/event-stream",
          body: "",
          events: [
            {
              type: "state",
              data: {
                path: "state.items",
                value: [
                  { id: "todo-1", description: "Write docs", done: false },
                ],
              },
            },
          ],
        }),
        'result.map(todo, {"value": todo.id, "label": todo.description})',
      )
    ).toEqual([{ label: "Write docs", value: "todo-1" }]);
  });
});
