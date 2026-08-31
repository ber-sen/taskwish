import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("manages todos and signals when one is completed", async () => {
  const root = await mkdtemp(join(tmpdir(), "taskwish-todo-test-"));
  const previousStorePath = process.env.TW_DEFAULT_STORE_PATH;
  process.env.TW_DEFAULT_STORE_PATH = join(root, "state");

  try {
    const { Todos } = await import(".");

    const todo = await Todos.addTodo({ description: "Write unit tests" });
    expect(todo).toMatchObject({
      description: "Write unit tests",
      done: false,
    });

    const events: unknown[] = [];
    for await (const event of Todos.completeTodo.stream({ id: todo.id })) {
      events.push(event);
    }

    expect(
      events.some(
        (event) =>
          typeof event === "object" &&
          event !== null &&
          "event" in event &&
          event.event === "Todos::TodoCompleted",
      ),
    ).toBe(true);
    expect(await Todos.listTodos({ done: true })).toHaveLength(1);
  } finally {
    if (previousStorePath === undefined) {
      delete process.env.TW_DEFAULT_STORE_PATH;
    } else {
      process.env.TW_DEFAULT_STORE_PATH = previousStorePath;
    }
    await rm(root, { recursive: true, force: true });
  }
});
