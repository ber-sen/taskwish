import { Agent, Step } from "taskwish";

import { routeFrom } from "../shared/text";
import { actor } from "./routing-graph";

export const { routeRequest } = actor()
  .on("Command", "routeRequest")

  .input({ request: "string" })

  .run(
    Agent("router", {
      model: "ollama/qwen3:4b",
      instructions: "Classify requests as exactly technical, billing, or general.",
    }),

    Agent("technical", {
      model: "ollama/qwen3:4b",
      instructions: "Resolve technical support requests.",
    }),

    Agent("billing", {
      model: "ollama/qwen3:4b",
      instructions: "Resolve billing support requests.",
    }),

    Agent("general", {
      model: "ollama/qwen3:4b",
      instructions: "Resolve general support requests.",
    }),

    Step("classifyRequest", async function () {
      return routeFrom(
        await this.router.generate({ prompt: this.input.request }),
      );
    }),

    Step("runSelectedBranch", async function () {
      const response = await this[this.classifyRequest].generate({
        prompt: this.input.request,
      });
      return { route: this.classifyRequest, response };
    }),
  )

  .meta({
    description: "Classify a request and traverse exactly one specialist branch",
    input: {
      request: {
        description: "Support request to route",
        example: "Why was my card charged twice?",
      },
    },
  });
