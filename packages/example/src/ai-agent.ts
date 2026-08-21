import { Agent } from "@taskwish/ai";
import { Actor, Step } from "taskwish";

const { aIAgent } = Actor("AIAgent").scope(
  Agent({
    provider: "codex",
    cwd: process.cwd(),
    model: process.env.CODEX_MODEL,
    reasoningEffort: process.env.CODEX_REASONING_EFFORT,
    permission: "reject_once",
  }),
);

export const { onMessage } = aIAgent()
  .on("Message")
  .run(
    Step("answer", function () {
      return this.agent.message(this.input.threadId, this.input.content);
    }),
  );

export const { AIAgent } = aIAgent().service({
  onMessage,
});
