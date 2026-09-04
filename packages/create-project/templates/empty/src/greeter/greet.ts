import { Step } from "taskwish";

import { actor } from "./actor";

export const { greet } = actor()
  .on("Command", "greet")

  .input({ name: "string" })

  .run(
    Step("formatName", function () {
      return this.input.name.trim();
    }),

    Step("createGreeting", function () {
      return `Hello, ${this.formatName}!`;
    }),
  )

  .meta({
    description: "Greet a person by name",
    input: {
      name: {
        description: "Name of the person to greet",
        example: "Ada",
      },
    },
    output: "Personalized greeting",
  });
