import { Actor, State } from "taskwish";

export const { actor } = Actor("Tickets").scope(
  State({
    tickets: State.List({
      id: "primary.uuidv4.random",
      customerId: "string",
      subject: "string",
      status: "string",
    }),
  }),
);
