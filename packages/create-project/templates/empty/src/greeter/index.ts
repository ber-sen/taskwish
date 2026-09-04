import { actor } from "./greeter";
import { greet } from "./greet";

export const { Greeter } = actor().service({ greet });
