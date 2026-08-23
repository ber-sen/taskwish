import { Actor, Agent, Step } from "taskwish";

const { actor } = Actor("CodexAgent").scope(
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

export const { CodexAgent } = actor().service({
  chat,
});
