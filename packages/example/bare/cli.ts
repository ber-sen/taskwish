import { configureWire } from "@taskwish/wire";

import { Greeter } from "./greeter";

configureWire({ log: "console" });

const result = await Greeter.hello({ name: "lorem" });

console.log(result);
