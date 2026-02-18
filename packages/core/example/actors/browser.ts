import { Actor, Step, Steps, SubSteps, Type } from "../../src";
import { ValidateSchema } from "../../src/helpers";

const Browser: Steps<typeof SubSteps> & {
  Act: <Ctx>(prompt: string) => {
    step: (ctx: Ctx) => Ctx;
  };
  Extract: <Ctx, const Schema>(
    name: string,
    schema: ValidateSchema<Schema>,
  ) => {
    step: (ctx: Ctx) => Ctx;
  };
  ExtractList: <Ctx, const Schema>(
    name: string,
    schema: ValidateSchema<Schema>,
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
      Step("launchBrowser", "https://news.ycombinator.com"),

      Browser.Act("Click the login button"),

      Browser.Extract("title", {
        title: "string",
      }),

      Browser.ExtractList("news", {
        title: "string",
        points: "number",
        by: "string",
        commentsURL: "string",
      }),
    ),

    Step("last step", function () {
      return this.news;
    }),
  );
