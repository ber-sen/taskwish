import { actor } from "./memory-loop";
import { runMemoryLoop } from "./run-memory-loop";

export const { MemoryLoop } = actor().service({ runMemoryLoop });
