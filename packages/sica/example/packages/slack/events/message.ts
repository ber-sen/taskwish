import { Event } from "../../../../src";

export default Event("message")
  .union()

  .data({
    type: "'message'",
    subtype: "'me_message'",
    channel: "string",
    user: "string",
    text: "string",
    ts: "string",
  })

  .or({
    type: "'message'",
    subtype: "'bot_message'",
    ts: "string",
    text: "string",
    bot_id: "string",
    username: "string",
    icons: "object",
  })

  .meta({
    description: "A message was sent to a channel",
    data: {
      channel: "Message channel",
    },
  });
