import { Actor, Step, Tool } from "../../src";
import { type } from "arktype";
// import tsEvent from "../events/ts-event";

export default Actor("ChatBot")
  .use(import("../package"))

  .on({ tools: "string[]", prompt: "string" })

  .handler(
    Tool("wether", {
      description: "Get the weather in a location",
      inputSchema: type({
        location: type("string").describe(
          "The location to get the weather for",
        ),
      }),
      run: async ({ location }) => {
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
