import { Actor } from "@taskwish/core";

import { Greeter } from "./greeter";

export const { Biller } = Actor("Biller").use(Greeter);

export const { onGreeterMessage } = Biller()
  .on("Greeter::Message")

  .run(function () {
    return {
      invoice: `Invoice created from greeter message: ${this.input.content}`,
    };
  });
