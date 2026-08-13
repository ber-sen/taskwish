import { hello } from "./greeter/hello";

const result = await hello({ name: "world" });

console.log(result);
