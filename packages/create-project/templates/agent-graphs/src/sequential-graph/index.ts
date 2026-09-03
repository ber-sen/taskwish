import { runSequentialGraph } from "./run-sequential-graph";
import { actor } from "./sequential-graph";

export const { SequentialGraph } = actor().service({ runSequentialGraph });
