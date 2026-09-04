import { Step } from "taskwish";

import { actor } from "./todos";

export const { listTodos } = actor()
  .on("Command", "listTodos")

  .input({ "done?": "boolean" })

  .run(
    Step("listTodos", function () {
      if (this.input.done === undefined) return this.state.items;
      return this.state.items.filter((todo) => todo.done === this.input.done);
    }),
  )

  .meta({
    description: "List todo items, optionally filtered by completion status",
    input: {
      done: {
        description: "Completion status to include",
        example: false,
      },
    },
  });
