import { actor } from "./debate-loop";
import { runDebateLoop } from "./run-debate-loop";

export const { DebateLoop } = actor().service({ runDebateLoop });
