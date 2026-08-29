import { Actor, State } from "taskwish";

export const { actor } = Actor("ActivityLog").scope(
  State({
    entries: State.List({
      id: "primary.uuidv4.random",
      message: "string",
    }),
  }),
);
