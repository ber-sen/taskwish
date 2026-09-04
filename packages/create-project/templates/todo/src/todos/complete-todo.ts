import { Step } from "taskwish";

import { actor } from "./todos";
import { listTodos } from "./list-todos";

export const { completeTodo } = actor()
  .use(listTodos)

  .on("Command", "completeTodo")

  .input({ id: "string" })

  .addStateCommand("item", {
    completeTodo: {
      input: { id: "item.id" },
      visible: { done: false },
    },
  })

  .run(
    Step("findTodo", function () {
      const todo = this.state.items.find((item) => item.id === this.input.id);
      if (!todo) throw new Error(`Todo ${this.input.id} does not exist.`);
      return todo;
    }),

    Step("markComplete", function () {
      this.findTodo.done = true;
      return this.findTodo;
    }),

    Step("signalTodoCompleted", function () {
      return this.signal("Todos::TodoCompleted", {
        id: this.markComplete.id,
        description: this.markComplete.description,
      });
    }),

    Step("returnCompletedTodo", function () {
      return this.markComplete;
    }),
  )

  .meta({
    description: "Mark a todo item as complete",
    input: {
      id: {
        description: "Todo identifier",
        example: "550e8400-e29b-41d4-a716-446655440000",
        suggestions: {
          $: "Todos::listTodos",
          "*": (items) =>
            items
              .filter((item) => !item.done)
              .map((item) => ({
                value: item.id,
                label: item.description,
              })),
        },
      },
    },
  });
