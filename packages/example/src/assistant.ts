import { Actor, Agent, Step } from "taskwish";

const { actor } = Actor("Assistant");

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

export const { Assistant } = actor().service({
  chat,
});
