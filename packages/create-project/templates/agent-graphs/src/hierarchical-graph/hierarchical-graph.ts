import { Actor } from "taskwish";

import { Ollama } from "../shared/ollama";

export const { actor } = Actor("HierarchicalGraph").use(Ollama);
