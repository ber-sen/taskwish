import { Actor, Step } from "../../src";
import { SubSteps } from "../../src/steps/sub-steps";

const BrowserActor: SubSteps = () => {
  return {} as never;
};

export default Actor("Simple")
  .use(import("../package"))

  .handler(
    BrowserActor("Scrape merrjep listing", (Step) => [
      Step("scrollUntilVisible", {
        element: "Laptop Stand",
        centerElement: true,
      }),

      Step("tapOn", {
        text: "Add to Cart",
        below: "Laptop Stand",
      }),
    ]),

    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Step("last step", function () {
      return this.firstStep.length;
    })
  );
