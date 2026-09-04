import { actor } from "./reflection-loop";
import { runReflectionLoop } from "./run-reflection-loop";

export const { ReflectionLoop } = actor().service({ runReflectionLoop });
