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
      if (!this.input.content) return this.agent.chat();
      if (!this.input.sessionId) {
        throw new Error("Agent chat sessionId is required.");
      }
      return this.agent.chat({
        sessionId: this.input.sessionId,
        content: this.input.content,
      });
    })
  );

export const { CodexAgent } = actor().service({
  chat,
});
