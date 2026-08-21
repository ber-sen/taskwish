import { Agent } from "@taskwish/ai";
import { Actor, Step } from "taskwish";

const { actor } = Actor("AIAgent").scope(
  Agent({
    provider: "codex",
    cwd: process.cwd(),
    model: process.env.CODEX_MODEL,
    reasoningEffort: process.env.CODEX_REASONING_EFFORT,
    permission: "reject_once",
  })
);

export const { chat } = actor()
  .on("Message")

  .run(
    Step("answer", function () {
      return this.agent.message(this.input.threadId, this.input.content);
    })
  );

export const { AIAgent } = actor().service({
  chat,
});
