import { Actor, Step, Steps, SubSteps } from "../../src";
import { ValidateSchema } from "../../src/helpers";

const Browser: Steps<typeof SubSteps> & {
  Act: <Ctx>(prompt: string) => {
    step: (ctx: Ctx) => Ctx;
  };
  Extract: <Ctx, Schema>(
    name: string,
    schema: ValidateSchema<Schema>,
  ) => {
    step: (ctx: Ctx) => Ctx;
  };
} = {} as never;

const { BrowserActor } = Actor("Browser Actor", {
  API_KEY: "string",
});

const { browse } = BrowserActor("browse")
  .on({ input: "string" })

  .run(
    Step("first step", function () {
      return this.run.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Browser(
      Step("launchBrowser", "http://www.google.com"),

      Step("info", function () {
        return 3;
      }),

      Browser.Act("Click the login button"),

      Browser.Extract("lorem", {
        order_id: "string",
        total: "number",
      }),
    ),

    Step("last step", function () {
      return this.info;
    }),
  );

export { browse };
