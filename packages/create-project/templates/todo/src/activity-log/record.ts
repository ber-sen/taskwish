import { actor } from "./actor";

export const { record } = actor()
  .on("Command", "record")

  .input({ message: "string" })

  .run(function () {
    this.state.entries.push({ message: this.input.message });
    return this.state.entries.at(-1)!;
  });
