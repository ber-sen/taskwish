import { runHierarchicalGraph } from "./run-hierarchical-graph";
import { actor } from "./hierarchical-graph";

export const { HierarchicalGraph } = actor().service({ runHierarchicalGraph });
