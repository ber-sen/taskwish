import { configureWire } from "@taskwish/wire";

import { Greeter } from "./greeter";
import { Biller } from "./biller";

configureWire({ log: "console", services: [Biller, Greeter] });

const result = await Greeter.hello({ name: "World" });

console.log(result);
