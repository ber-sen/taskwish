import { Actor, Agent, Desc, Step, Tool, Type } from "../../src";
import { Coordinator } from "../../src/coordinator";

export const { Handler } = Actor(Coordinator("Handler"));

export const { chat } = Handler()
  .action("chat")

  .input({ prompt: "string" })

  .run(
    Step("run", function () {
      return this.input
    }),
  );
