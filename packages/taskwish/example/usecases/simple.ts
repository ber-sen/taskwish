import { run, UseCase } from "../../src";

export default UseCase("Simple")
  .description("Send message to slack")

  .steps(
    run("Slack.sendMessage", {
      channel: "#general",
      text: "Hi",
    })
  );
