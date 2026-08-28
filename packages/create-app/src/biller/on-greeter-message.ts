"use server";

import { actor } from "./biller";

export const { onGreeterMessage } = actor()
  .on("Greeter::Message")

  .run(function () {
    return {
      invoice: `Invoice created from Greeter message: ${this.input.name}`,
    };
  });
