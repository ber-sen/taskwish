import { End, Message, UseCase } from "../../src";
import tsEvent from "../events/ts-event";

export default UseCase("Chat bot")
  .use(import("../package"))

  .on(tsEvent)

  .agent(
    "marketing",

    Message.System("You are a helpful marketing assistent called Boria"),
    Message.User("asdasd"),

    ["slack.send-message", { description: "send a slack message", ask: true }],
    ["slack.send-message", { ask: true }]
  )

  .steps(
    ["step1", () => 213],

    ($) => $.agent.marketing.respond({})
  );
