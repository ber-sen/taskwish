import { Actor, Step, Struct } from "../../src";
import { Browser } from "./browser";

const { actor } = Actor("Example");

export const { runSteps } = actor()
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

      Struct("NewsItem", {
        title: "string",
        points: "number",
        by: "string",
        commentsURL: "string",
      }),

      Browser.Extract("news", "NewsItem[] >= 5")
    ),

    Step("end", function () {
      return this;
    })
  );

export const { Example } = actor().service({ runSteps });
