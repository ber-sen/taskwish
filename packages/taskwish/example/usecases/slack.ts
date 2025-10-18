import { UseCase } from "../../src";
import slack from "../packages/slack";

export default UseCase("Slack")
  .trigger(slack.events.message)

  .steps(["fist step", ($) => $.event.data.text]);
