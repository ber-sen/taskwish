import { Actor, Agent, Desc, Step, Tool, Type } from "../../src";
import { Orchestrator } from "../../src/orchestrator";

const { Handler } = Actor(Orchestrator("Handler"));

export const { chat } = Handler()
  .action("chat")

  .input({ prompt: "string" })

  .run(
    Step("run", function () {
      return this.input
    }),
  );
