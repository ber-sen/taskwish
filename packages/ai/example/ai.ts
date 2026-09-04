import { Action, Step } from "@taskwish/core";
import { Tool } from "../src";
// import tsEvent from "../events/ts-event";

const Type = <const T, const D>(
  _type: T,
  _meta?: { desciption: D },
): readonly [T, "|", never] => {
  return {} as never;
};

export const { chat } = Action("chat")
  .input({ tools: "string[]", prompt: "string" })

  .run(
    Tool("wether", {
      description: "Get the weather in a location",
      input: {
        location: Type("string", { desciption: "asdadads" }),
      },
      run() {
        console.log(this.input.location);

        return { temperature: 72, conditions: "sunny" };
      },
    }),

    Step("response", function () {
      this.actions.generateText({
        model: "gpt5",
        prompt: "asdad",
      });
    }),
  );
