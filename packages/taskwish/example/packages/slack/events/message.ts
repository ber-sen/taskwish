import { Event } from "../../../../src";

export default Event("message")
  .data({
    type: "'message'",
    subtype: "'bot_message'|'bot_2_message'",
    channel: "string",
    user: "string",
    text: "string",
    ts: "string",
  })

  .describe({
    description: "A message was sent to a channel",
    data: {
      channel: "Message channel",
    },
  });
