import { Actor, Agent, Step } from "taskwish";

const { actor } = Actor("CodexAgent");

export const { chat } = actor()
  .on("Message")

  .run(
    Agent({
      runtime: "codex",
      cwd: process.cwd(),
      model: process.env.CODEX_MODEL,
      reasoningEffort: process.env.CODEX_REASONING_EFFORT,
      permission: "reject_once",
    }),

    Step("answer", function () {
      return this.agent.chat(this.input);
    }),
  );

export const { CodexAgent } = actor().service({
  chat,
});
