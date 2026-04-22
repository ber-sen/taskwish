import { Actor, Step, Type } from "../../src";
import { Browser } from "./browser";

const { MyActor } = Actor("MyActor");
export const { runSteps } = MyActor()
  .on("Command", "runSteps")

  .input({ message: "string" })

  .run(
    Step("first step", function () {
      return this.actions.slack.sendMessage({
        "@": "work",
        channel: "#general",
        message: this.input.message,
      });
    }),

    Browser(
      Step("launchBrowser", {
        "@": "myBrowser",
        url: "https://news.ycombinator.com",
      }),

      Browser.Act("Click the login button"),

      Type("NewsItem", {
        title: "string",
        points: "number",
        by: "string",
        commentsURL: "string",
      }),

      Browser.Extract("news", "NewsItem[] >= 5"),
    ),

    Step("end", function () {
      return this;
    }),
  );
