import { Actor, Step, Type } from "../../src";
import { Browser } from "./browser";

const { MyActor } = Actor("My actor");

export const { runSteps } = MyActor()
  .Action("Run steps")

  .on({ message: "string" })

  .run(
    Step("first step", function () {
      return this.run.slack["@work"].sendMessage({
        channel: "#general",
        message: this.input.message,
      });
    }),

    Browser["@myBrowser"](
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
  );
