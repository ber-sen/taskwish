import { Actor, Step, Type } from "../../src";
import { Browser } from "./browser";

const { MyActor } = Actor("My actor");

export const { runSteps } = MyActor()
  .on("command", "Run steps")

  .input({ message: "string" })

  .run(
    Step("first step", function () {
      return this.run.slack.sendMessage({
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

      Type("News item", {
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
