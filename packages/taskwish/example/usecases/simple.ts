import { run, UseCase } from "../../src";

export default UseCase("Simple").steps(
  run("Slack.sendMessage", {
    channel: "#general",
    text: "Hi",
  })
);
