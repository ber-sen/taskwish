import { Actor, Step } from "../../src";

// Actions from the dynamic import are merged into this.actions at the type level.
// No slack hardcoding — the scope is driven by whatever .use() receives.
const { myActor } = Actor("MyActor").use(import("@taskwish/slack"));

export const { sendMessage } = myActor()
  .on("Command", "sendMessage")

  .run(
    Step("First step", function () {
      // `postMessage` is typed from the dynamic import above — no hardcoding needed
      return this.actions.slack.postMessage({
        channel: "#general",
        text: `Hello World`,
      });
    }),
  );

export const { MyActor } = myActor().service({ sendMessage });
