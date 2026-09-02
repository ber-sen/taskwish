import { Actor } from "taskwish";

import { Ollama } from "../shared/ollama";

export const { actor } = Actor("GoalDrivenLoop").use(Ollama);
