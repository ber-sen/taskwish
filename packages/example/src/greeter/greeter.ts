import { Actor, Event } from "taskwish";

export const { greeter } = Actor("Greeter").scope(
  Event("Message", { name: "string" }),
);
