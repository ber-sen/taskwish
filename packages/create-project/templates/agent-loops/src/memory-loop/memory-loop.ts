import { Actor, State } from "taskwish";

export const { actor } = Actor("MemoryLoop").scope(
  State({
    memories: State.List({
      id: "primary.uuidv4.random",
      text: "string",
    }),
  }),
);
