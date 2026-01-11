import { Actor, Step } from "../../src";
import { SubSteps } from "../../src/steps/sub-steps";

const BrowserSteps: SubSteps = () => {
  return {} as never;
};

export default Actor("Simple")
  .use(import("../package"))

  .handler(
    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),
    
    BrowserSteps("Scrape merrjep listing", (Step) => [
      Step("scrollUntilVisible", {
        element: "Laptop Stand",
        centerElement: true,
      }),
    ]),

    Step("last step", function () {
      return this.firstStep.length;
    })
  );
