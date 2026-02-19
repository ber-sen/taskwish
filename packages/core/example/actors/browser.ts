import { Actor, Description, Step, Steps, SubSteps, Type } from "../../src";
import { PrettyScope, ValidateSchema } from "../../src/helpers";

export const Browser: Steps<typeof SubSteps> & {
  [key: `@${string}`]: Steps<typeof SubSteps>;
} & {
  Act: <Ctx>(prompt: string) => {
    step: (ctx: Ctx) => Ctx;
  };
  Extract: <Ctx extends Record<any, any>, const Schema>(
    name: string,
    schema: ValidateSchema<Schema, PrettyScope<Ctx["scope"]>>,
  ) => {
    step: (ctx: Ctx) => Ctx;
  };
} = {} as never;

const { BrowserActor } = Actor("Browser Actor", {
  API_KEY: "string",
});

export const { browse } = BrowserActor()
  .Action("Browse")

  .on({ input: "string" })

  .run(
    Step("first step", function () {
      return this.run.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Browser(
      Step("launchBrowser", { url: "https://news.ycombinator.com" }),

      Browser.Act("Click the login button"),

      Type("News item", {
        title: "string",
        points: "number",
        by: "string",
        commentsURL: "string",
      }),

      Browser.Extract("news", "NewsItem[] >= 5"),
    ),

    Step("last step", function () {
      return this;
    }),
  );
