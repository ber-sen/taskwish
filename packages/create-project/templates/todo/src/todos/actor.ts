import { Actor, Event, State } from "taskwish";

export const { actor } = Actor("Todos").scope(
  Event("TodoCompleted", {
    id: "string",
    description: "string",
  }),

  State({
    items: State.List({
      id: "primary.uuidv4.random",
      description: "string",
      done: "boolean",
    }),
  }),
);
