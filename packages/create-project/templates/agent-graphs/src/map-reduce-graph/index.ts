import { runMapReduceGraph } from "./run-map-reduce-graph";
import { actor } from "./map-reduce-graph";

export const { MapReduceGraph } = actor().service({ runMapReduceGraph });
