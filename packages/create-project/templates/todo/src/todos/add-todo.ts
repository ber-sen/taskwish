import { Step } from "taskwish";

import { actor } from "./todos";

export const { addTodo } = actor()
  .on("Command", "addTodo")

  .input({ description: "string" })

  .run(
    Step("addTodo", function () {
      this.state.items.push({
        description: this.input.description,
        done: false,
      });
      return this.state.items.at(-1)!;
    }),
  )

  .meta({
    description: "Add an item to the todo list",
    input: {
      description: {
        description: "Work that needs to be done",
        example: "Build with TaskWish",
      },
    },
  });
