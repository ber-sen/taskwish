import { greeter } from "./greeter";
import { hello } from "./hello";

export const { Greeter } = greeter().service({
  hello,
});
