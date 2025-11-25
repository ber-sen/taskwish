import { Source, UseCase } from "../../src";

export default UseCase("Simple")
  .use(import("../package"))

  .steps({
    name: "asds ipsum",
    options: [Source.pipeTo(Response)],

    run: ({ action }) =>
      action.slack.sendMessage({
        channel: "#general",
        text: "Hello World",
      }),
  })

  .meta({ description: "Send a message to slack" });
