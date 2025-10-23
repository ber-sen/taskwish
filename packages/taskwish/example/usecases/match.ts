import { UseCase } from "../../src";
import slack from "../packages/slack";

export default UseCase("Slack")
  .trigger(slack.events.message)

  .steps(
    ($) => Match($.input, { subtype: true }),

    "me_message",

    ["lorem", $ => asdad],

    "bot_message",

    ["ipsum", $ => asdad],

    End(Match)
  );
