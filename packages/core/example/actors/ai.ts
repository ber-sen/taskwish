import { Actor, Description, Step, Tool, Type } from "../../src";
// import tsEvent from "../events/ts-event";

export default Actor("ChatBot")
  .use(import("../package"))

  .on({ tools: "string[]", prompt: "string" })

  .run(
    Tool("wether", {
      description: "Get the weather in a location",
      input: {
        location: ["string", Description`The location to get the weather for`],
      },
      run() {
        console.log(this.input.location);

        return { temperature: 72, conditions: "sunny" };
      },
    }),

    Step("response", function () {
      this.run.generateText({
        model: "gpt5",
        prompt: "asdad",
      });
    }),
  );
