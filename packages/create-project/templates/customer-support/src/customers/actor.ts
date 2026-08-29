import { Actor, State } from "taskwish";

export const { actor } = Actor("Customers").scope(
  State({
    customers: State.List({
      id: "primary.uuidv4.random",
      name: "string",
      email: "string",
    }),
  }),
);
