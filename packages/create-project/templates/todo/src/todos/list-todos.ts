import { actor } from "./actor";

export const { listTodos } = actor()
  .on("Command", "listTodos")

  .input({ "done?": "boolean" })

  .run(function () {
    if (this.input.done === undefined) return this.state.items;
    return this.state.items.filter((todo) => todo.done === this.input.done);
  });
