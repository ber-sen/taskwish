import { Actor } from "taskwish";

import { GitHub } from "../github";
import { Ollama } from "../shared/ollama";

const { actor: createActor } = Actor("EventDrivenLoop").use(Ollama);

export const actor = () => createActor().use(GitHub);
