import { actor } from "./greeter";
import { hello } from "./hello";

export const { Greeter } = actor().service({
  hello,
});
