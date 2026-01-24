import { Actor, Step, Tool } from "../../src";
import { type } from "arktype";
// import tsEvent from "../events/ts-event";

export default Actor("ChatBot")
  .use(import("../package"))

  .on({ tools: "string[]", prompt: "string" })

  .handler(
    Tool("wether", {
      description: "Get the weather in a location",
      input: {
        location: "string",
      },
      run() {
        console.log(this.input.location);

        return { temperature: 72, conditions: "sunny" };
      },
    }),

    Step("response", function () {
      this.ai.generateText({
        model: "gpt5",
        prompt: "asdad",
      });
    }),
  );
