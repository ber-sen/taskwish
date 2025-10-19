import { UseCase } from "../../src";
import slack from "../packages/slack";

export default UseCase("Slack")
  .trigger(slack.events.message)

  .steps(
    ($) => Match($.input, { subtype: "bot_message" }),

    ({ match }) => match.bot_id,

    ($) => Match($.input, { subtype: "me_message" }),

    ({ match }) => match.user,

    End(Match)
  );
