import { Actor } from "taskwish";

import { Greeter } from "./greeter";

const { biller } = Actor("Biller").use(Greeter);

export const { onGreeterMessage } = biller()
  .on("Greeter::Message")

  .run(function () {
    return {
      invoice: `Invoice created from greeter message: ${this.input.name}`,
    };
  });

export const { Biller } = biller().service({
  listeners: [onGreeterMessage],
});
