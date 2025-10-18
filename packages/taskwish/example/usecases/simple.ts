import { run, UseCase } from "../../src";

export default UseCase("Simple")
  .describe({ description: "Send a message to slack" })

  .steps(
    run("Slack.sendMessage", {
      channel: "#general",
      text: "Hi",
    })
  );
