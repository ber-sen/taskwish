import { Actor, Agent, Desc, Step, Tool, Type } from "../../src";
import { Coordinator } from "../../src/coordinator";

const { handler } = Actor(Coordinator("Handler"));

export const { chat } = handler()
  .action("chat")

  .input({ prompt: "string" })

  .run(
    Step("run", function () {
      return this.input
    }),
  );

export const { Handler } = handler().service({ public: [chat] });
