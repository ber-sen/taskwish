import { Actor, Step, Steps, SubSteps } from "../../src";
import { OptionSubSteps } from "../../src/steps/sub-steps";

const Options = Object.assign(
  (...args: any) => {
    return {} as never;
  },
  {
    default: () => {
      return {} as never;
    },
  },
);

export default Actor("Simple")
  .use(import("../package"))

  .on({ message: "string" })

  .run(
    Step(
      "first step",
      { retries: { limit: 3, delay: "5 seconds", backoff: "linear" } },
      function () {
        return this.action.slack.sendMessage({
          channel: "#general",
          message: this.input.message,
        });
      },
    ),

    Step("last step", function () {
      return this.firstStep.length;
    }),
  );
