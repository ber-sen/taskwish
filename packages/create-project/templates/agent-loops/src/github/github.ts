import { Actor, Event } from "taskwish";

export const { actor } = Actor("GitHub").scope(
  Event("IssueOpened", {
    owner: "string",
    repository: "string",
    number: "number",
    title: "string",
    body: "string",
    url: "string",
  })
);
