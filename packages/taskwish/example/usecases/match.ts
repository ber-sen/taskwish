import { UseCase } from "../../src";
import slack from "../packages/slack";

export default UseCase("Slack")
  .trigger(slack.events.message)

  .steps(
    ($) => Match($.input, { subtype: true }),

    [With, "me_message"],

    ["lorem", $ => asdad],

    [With, "bot_message"],

    ["ipsum", $ => asdad],

    End(Match)
  );
