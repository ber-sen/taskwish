"use server";

import { Step } from "taskwish";
import { greeter } from "./greeter";

export const { hello } = greeter()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(
    Step("notify", function () {
      return this.signal("Greeter::Message", { name: this.input.name });
    }),

    Step("greet", function () {
      return `Hello ${this.input.name}`;
    }),
  );

