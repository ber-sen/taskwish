import { runFallbackGraph } from "./run-fallback-graph";
import { actor } from "./fallback-graph";

export const { FallbackGraph } = actor().service({ runFallbackGraph });
