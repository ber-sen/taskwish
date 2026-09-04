import { actor } from "./actor";
import { greet } from "./greet";

export const { Greeter } = actor().service({ greet });
