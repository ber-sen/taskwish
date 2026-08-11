"use server";

import { biller } from "./biller";

export const { onGreeterMessage } = biller()
  .on("Greeter::Message")

  .run(function () {
    return {
      invoice: `Invoice created from greeter message: ${this.input.name}`,
    };
  });
