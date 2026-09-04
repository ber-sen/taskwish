import { Step } from "taskwish";

import { actor } from "./actor";
import { createMotivationalTodo } from "./create-motivational-todo";

export const { onTodosTodoCompleted } = actor()
  .use(createMotivationalTodo)

  .on("Todos::TodoCompleted")

  .run(
    Step("createNextTodo", function () {
      return this.actions.motivator.createMotivationalTodo({
        completedTodoDescription: this.input.description,
      });
    }),
  )

  .meta({
    description: "Create a new motivational todo after one is completed",
  });
