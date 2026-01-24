import { Actor } from "../../src";

export default Actor("Slack")
  .use(import("../package"))

  .on("slack.message")

  .steps(
    ($) => Match($.input, { subtype: true }),

    "me_message",

    ($) => $.match,

    "bot_message",

    { name: "lorem", run: ($) => 3 },

    ($) => $.ipsum,

    End(Match)
  );
