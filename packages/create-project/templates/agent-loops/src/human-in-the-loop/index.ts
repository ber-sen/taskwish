import { actor } from "./human-in-the-loop";
import { runHumanInTheLoop } from "./run-human-in-the-loop";

export const { HumanInTheLoop } = actor().service({ runHumanInTheLoop });
