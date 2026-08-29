import { actor } from "./actor";

export const { addTodo } = actor()
  .on("Command", "addTodo")

  .input({ description: "string" })

  .run(function () {
    this.state.items.push({
      description: this.input.description,
      done: false,
    });
    return this.state.items.at(-1)!;
  });
