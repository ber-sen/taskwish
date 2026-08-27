import { Actor, Agent, Step } from "taskwish";

const { actor } = Actor("FxAgent");

export const { chat } = actor()
  .on("Message")

  .run(
    Agent({
      runtime: "fx",
      cwd: process.cwd(),
      model: process.env.FX_MODEL,
      permission: "reject_once",
    }),

    Step("answer", function () {
      return this.agent.chat(this.input);
    }),
  );

export const { FxAgent } = actor().service({
  chat,
});
