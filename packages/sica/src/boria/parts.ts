import { Part } from "./part";

export const Text = Part({
  type: "'text'",
  text: "string",
});

Text({ text: "asdad" });
