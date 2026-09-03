import { runParallelGraph } from "./run-parallel-graph";
import { actor } from "./parallel-graph";

export const { ParallelGraph } = actor().service({ runParallelGraph });
