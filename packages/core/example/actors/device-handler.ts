import { Actor, Agent, Desc, Step, Tool, Type } from "../../src";
import { DeviceHandler } from "../../src/device-handler";

const { Handler } = Actor(DeviceHandler("Handler"));

export const { chat } = Handler()
  .on("Command", "chat")

  .input({ prompt: "string" })

  .run(
    Step("run", function () {
      return this.input
    }),
  );
