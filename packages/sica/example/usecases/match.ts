import { UseCase } from "../../src";

export default UseCase("Slack")
  .use(import("../package"))

  .on("slack.message")

  .steps(
    ($) => Match($.input, { subtype: true }),

    "me_message",

    ($) => $.match,

    "bot_message",

    ($) => Step("ipsum").value($.match),

    ($) => $.ipsum,

    End(Match)
  );
