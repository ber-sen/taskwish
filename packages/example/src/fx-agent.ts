import { Actor, Agent, Step } from "taskwish";

const { actor } = Actor("FxAgent").scope(
  Agent({
    runtime: "fx",
    cwd: process.cwd(),
    model: process.env.FX_MODEL,
    permission: "reject_once",
  })
);

export const { chat } = actor()
  .on("Message")

  .run(
    Step("answer", function () {
      return this.agent.chat(this.input);
    })
  );

export const { FxAgent } = actor().service({
  chat,
});
