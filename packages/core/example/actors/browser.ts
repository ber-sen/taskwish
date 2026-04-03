import { Actor, Step, Steps, SubSteps, Taskwish, Type } from "../../src";
import { PrettyScope, ValidateSchema } from "../../src/helpers";

export const Browser: Steps<typeof SubSteps> & {
  Act: <Ctx>(prompt: string) => {
    [Taskwish.Step]: (ctx: Ctx) => Ctx;
  };
  Extract: <Ctx extends Record<any, any>, const Schema>(
    name: string,
    schema: ValidateSchema<Schema, PrettyScope<Ctx["scope"]>>,
  ) => {
    [Taskwish.Step]: (ctx: Ctx) => Ctx;
  };
} = {} as never;

export const { BrowserActor } = Actor("BrowserActor");

BrowserActor()
  .on("newMessage")

  .run(
    Step("first step", function () {
      return this.run.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),
  );

export const { browse } = BrowserActor()
  .on("Command", "Browse")

  .input({ name: "string" })

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

      Browser.Extract("news", "NewsItem[] <= 5"),
    ),

    Step("last step", function () {
      return this;
    }),
  );
