import { Actor, Event } from "taskwish";

import { GitHub } from "../github";
import { Ollama } from "../shared/ollama";

const { actor: createActor } = Actor("CodingAgent")
  .use(Ollama)
  
  .scope(
    Event("ChangeProposed", {
      owner: "string",
      repository: "string",
      number: "number",
      title: "string",
      url: "string",
      proposal: "string",
    }),
  );

export const actor = () => createActor().use(GitHub);
