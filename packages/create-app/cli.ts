import { configureWire } from "@taskwish/wire";

import { Greeter } from "./src/greeter";
import { performance } from "node:perf_hooks";

configureWire({ log: "console" });

const now = performance.now();

for (let i = 0; i < 1000; i++) {
  const result = await Greeter.hello({ name: "World" });

  console.log(result);
}

const end = performance.now();

console.log(end - now);
