import { describe, expect, test } from "bun:test";

import type { ConsoleAction } from "../types";
import { normalizeActions } from "./command-actions";

describe("command actions", () => {
  test("formats fallback action labels as sentence case", () => {
    const action = {
      id: "Todos::addTodo",
      actor: "",
      action: "",
      label: "",
      mode: "form",
      route: "/tw/Todos/add-todo",
      source: "local",
      input: [],
      meta: {},
    } satisfies ConsoleAction;

    expect(normalizeActions([action])[0]!.label).toBe("Add todo");
  });
});
