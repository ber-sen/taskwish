import { End, Message, UseCase } from "../../src";
import tsEvent from "../events/ts-event";

export default UseCase("Chat bot")
  .use(import("../package"))

  .on(tsEvent)

  .steps(
    Agent("main"),

    Message.System("You are a helpful marketing assistent called Boria"),
    Message.User("asdasd"),

    End(),

    ($) => agent.main({})
  );
