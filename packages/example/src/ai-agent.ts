import { Agent } from "@taskwish/ai";
import { Actor, Step } from "taskwish";

const { aIAgent } = Actor("AIAgent").scope(
  Agent({
    provider: "codex",
    cwd: process.cwd(),
    model: process.env.CODEX_MODEL,
    reasoningEffort: process.env.CODEX_REASONING_EFFORT,
    permission: "reject_once",
  })
);

export const { prompt } = aIAgent()
  .on("Command", "prompt")

  .input({ prompt: "string" })

  .run(
    Step("answer", function () {
      return this.agent.prompt(this.input.prompt);
    })
  );

export const { AIAgent } = aIAgent().service({
  prompt,
});
