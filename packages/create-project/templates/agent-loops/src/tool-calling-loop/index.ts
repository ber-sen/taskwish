import { actor } from "./tool-calling-loop";
import { runToolCallingLoop } from "./run-tool-calling-loop";

export const { ToolCallingLoop } = actor().service({ runToolCallingLoop });
