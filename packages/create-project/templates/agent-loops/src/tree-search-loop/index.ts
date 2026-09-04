import { actor } from "./tree-search-loop";
import { runTreeSearchLoop } from "./run-tree-search-loop";

export const { TreeSearchLoop } = actor().service({ runTreeSearchLoop });
