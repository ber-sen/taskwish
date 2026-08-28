import { Actor, Event } from "taskwish";

export const { actor } = Actor("Greeter").scope(
  Event("Message", { name: "string" })
);
