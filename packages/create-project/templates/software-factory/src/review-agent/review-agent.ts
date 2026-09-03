import { Slack } from "@taskwish/slack";
import { Actor, Event } from "taskwish";

import { CodingAgent } from "../coding-agent";
import { Ollama } from "../shared/ollama";

const { actor: createActor } = Actor("ReviewAgent")
  .use(Ollama)
  
  .scope(
    Event("ChangeReviewed", {
      owner: "string",
      repository: "string",
      number: "number",
      url: "string",
      review: "string",
    }),
  );

export const actor = () => createActor().use(Slack).use(CodingAgent);
