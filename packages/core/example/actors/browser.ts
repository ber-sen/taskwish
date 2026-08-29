import { Actor, Step, Steps, SubSteps, Struct, TW } from "../../src";
import { PrettyScope, ValidateSchema } from "../../src/helpers";

export const Browser: Steps<typeof SubSteps> & {
  Act: <Ctx>(prompt: string) => {
    [TW.Step]: (ctx: Ctx) => Ctx;
  };
  Extract: <Ctx extends Record<any, any>, const Schema>(
    name: string,
    schema: ValidateSchema<Schema, PrettyScope<Ctx["scope"]>>
  ) => {
    [TW.Step]: (ctx: Ctx) => Ctx;
  };
} = {} as never;

export const { actor } = Actor("BrowserActor");

actor()
  .on("BrowserActor")

  .run(
    Step("firstStep", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    })
  );

export const { browse } = actor()
  .on("Command", "browse")

  .input({ name: "string" })

  .run(
    Step("firstStep", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Browser(
      Step("launchBrowser", { url: "https://news.ycombinator.com" }),

      Browser.Act("Click the login button"),

      Struct("NewsItem", {
        points: "number",
        by: "string",
        commentsURL: "string",
      }),

      Browser.Extract("news", "NewsItem[] <= 5")
    ),

    Step("lastStep", function () {
      return this.NewsItem;
    })
  );

export const { BrowserActor } = actor().service({ browse });
