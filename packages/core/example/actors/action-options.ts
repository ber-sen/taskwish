import { Slack } from "@taskwish/slack";
import { Actor, Step } from "../../src";

const { actor } = Actor("Example");

export const { runSteps } = actor()
  .use(Slack)

  .on("Command", "runSteps")

  .input({ message: "string" })

  .run(
    Step("firstStep", function () {
      return this.actions.slack.postMessage({
        "🔑": "work",
        channel: "#general",
        text: "asdasd",
      });
    }),

    Step("lastStep", function () {
      return this.firstStep.length;
    })
  );

export const { Example } = actor().service({ runSteps });
