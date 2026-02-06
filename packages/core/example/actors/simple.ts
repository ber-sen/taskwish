import { Source, Actor } from "../../src";

export default Actor("Simple")
  .use(import("../package"))

  .steps({
    name: "asds ipsum",
    options: [Source.pipeTo(Response)],

    run: ({ action }) =>
      action.Slack.sendMessage({
        channel: "#general",
        text: "Hello World",
      }),
  })

  .meta({ description: "Send a message to slack" });
