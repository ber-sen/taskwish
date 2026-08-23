import { Actor, Agent, Step } from "taskwish";

const { actor } = Actor("FxAgent").scope(
  Agent({
    provider: "fx",
    cwd: process.cwd(),
    model: process.env.FX_MODEL,
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

export const { FxAgent } = actor().service({
  chat,
});
