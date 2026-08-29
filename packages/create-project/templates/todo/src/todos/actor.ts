import { Actor, State } from "taskwish";

export const { actor } = Actor("Todos").scope(
  State({
    items: State.List({
      id: "primary.uuidv4.random",
      description: "string",
      done: "boolean",
    }),
  }),
);
