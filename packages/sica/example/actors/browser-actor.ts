import { Source, Actor, Step, Last } from "../../src";

const BrowserActor = <const Name, Scope>(
  name: Name,
  step: (
    step: (
      name: "launchApp" | "scrollUntilVisible" | "tapOn",
      options: any
    ) => any
  ) => any
): {
  step: (
    scope: Scope
  ) => Name extends string
    ? Record<Name, boolean> &
        Record<typeof Last, boolean> &
        Omit<Scope, typeof Last>
    : Scope;
} => {
  return {} as never;
};

export default Actor("Simple")
  .use(import("../package"))

  .handler(
    BrowserActor("Scrape merrjep listing", (Step) => [
      Step("launchApp", "com.acme.toppicks"),

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
