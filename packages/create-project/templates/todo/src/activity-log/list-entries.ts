import { actor } from "./actor";

export const { listEntries } = actor()
  .on("Command", "listEntries")

  .run(function () {
    return this.state.entries;
  });
