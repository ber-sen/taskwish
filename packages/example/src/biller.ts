import { Actor } from "@taskwish/core";

import { Greeter } from "./greeter";
import { sleep } from "bun";

export const { Biller } = Actor("Biller").use(Greeter);

export const { onGreeterMessage } = Biller()
  .on("Greeter::Message")

  .run(async function () {
    await sleep(3000)

    return {
      invoice: `Invoice created from greeter message: ${this.input.name}`,
    };
  });
