import { UseCase } from "../../src";

export default UseCase("Slack")
  .use(import("../packages/slack"))
  
  .on("slack:message")

  .steps(
    ($) => Match($.input, { subtype: true }),

    "me_message",

    ["lorem", ($) => asdad],

    "bot_message",

    ["ipsum", ($) => asdad],

    End(Match),
  );
