import { actor } from "./actor";

export const { completeTodo } = actor()
  .on("Command", "completeTodo")

  .input({ id: "string" })

  .run(function () {
    const todo = this.state.items.find((item) => item.id === this.input.id);
    if (!todo) throw new Error(`Todo ${this.input.id} does not exist.`);
    todo.done = true;
    return todo;
  });
