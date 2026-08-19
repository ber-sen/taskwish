import { Slack } from "@taskwish/slack";
import { Actor, Step } from "../../src";

const { myActor } = Actor("MyActor");

const onElicit = () => {};

export const { runSteps } = myActor()
  .use(Slack)

  .on("Command", "runSteps")

  .input({ message: "string" })

  .run(
    Step("firstStep", function () {
      return this.actions.slack.postMessage({
        "🔑": "work",
        "❓": onElicit,
        channel: "#general",
        text: "asdasd",
      });
    }),

    Step("lastStep", function () {
      return this.firstStep.length;
    }),
  );

export const { MyActor } = myActor().service({ runSteps });
