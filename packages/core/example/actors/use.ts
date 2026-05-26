import { Actor, Step } from "../../src";

// Actions from the dynamic import are merged into this.actions at the type level.
// No slack hardcoding — the scope is driven by whatever .use() receives.
const { MyActor } = Actor("MyActor").use(import("@taskwish/slack"));

export const { sendMessage } = MyActor()
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
