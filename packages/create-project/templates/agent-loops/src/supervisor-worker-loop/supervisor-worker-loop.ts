import { Actor } from "taskwish";

import { Ollama } from "../shared/ollama";

export const { actor } = Actor("SupervisorWorkerLoop").use(Ollama);
