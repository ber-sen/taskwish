import { Agent, Message } from "../../src";

export default Agent(
  "Marketing",

  import("../package"),

  Message.System("You are a helpful marketing assistent called Boria")
);

Agent(Message.User("Who are you?"));
// or
Agent({ prompt: "Who are you?" });
