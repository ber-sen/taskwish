import { Step } from "../../src";
import { Coordinator } from "../../src/coordinator";

const { actor } = actor(Coordinator("Handler"));

export const { chat } = actor()
  .action("chat")

  .input({ prompt: "string" })

  .run(
    Step("run", function () {
      return this.input;
    })
  );

export const { Handler } = actor().service({ chat });
