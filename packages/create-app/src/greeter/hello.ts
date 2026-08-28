"use server";

import { Step } from "taskwish";
import { actor } from "./greeter";

export const { hello } = actor()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(
    Step("notify", function () {
      return this.signal("Greeter::Message", { name: this.input.name });
    }),

    Step("greet", function () {
      return `Hello ${this.input.name}`;
    })
  );
