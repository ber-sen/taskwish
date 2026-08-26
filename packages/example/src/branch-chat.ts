import { Actor, Agent, Step } from "taskwish";

const { actor } = Actor("BranchChat");

export const { chat } = actor()
  .on("Command", "chat")

  .input({ threadId: "string", content: "string" }, "|", "void")

  .run(
    Agent({
      runtime: "codex",
      cwd: process.cwd(),
      model: process.env.CODEX_MODEL,
      reasoningEffort: process.env.CODEX_REASONING_EFFORT,
      permission: "reject_once",
    }),

    Step("default", function () {
      return this.agent.chat(this.input);
    }),
  );

export const { BranchChat } = actor().service({
  chat,
});

export async function usage() {
  const { threadId } = await chat();

  const reply = await chat({ threadId, content: "Hello" });

  return { threadId, reply };
}
