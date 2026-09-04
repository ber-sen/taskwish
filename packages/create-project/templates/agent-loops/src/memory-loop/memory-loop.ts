import { Actor, State } from "taskwish";

import { Ollama } from "../shared/ollama";

export const { actor } = Actor("MemoryLoop")
  .use(Ollama)
  .scope(
    State({
      memories: State.List({
        id: "primary.uuidv4.random",
        text: "string",
      }),
    })
  );
