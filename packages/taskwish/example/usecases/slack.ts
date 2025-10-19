import { match } from "ts-pattern";
import { UseCase } from "../../src";
import slack from "../packages/slack";

export default UseCase("Slack")
  .trigger(slack.events.message)

  .steps(($) =>
    match($.input)
      .with({ subtype: "bot_message" }, (message) => message.bot_id)
      .with({ subtype: "me_message" }, (message) => message.user)
  );
