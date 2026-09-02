import { Actor } from "taskwish";

import { Ollama } from "../shared/ollama";

export const { actor } = Actor("SelfAskLoop").use(Ollama);
