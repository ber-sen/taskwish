import { type } from "arktype";
import { Event } from "../../../../src";

export const message = type({
  type: "'message'",
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
  .or({
    type: "'message'",
    subtype: "'me_message'",
    channel: "string",
    user: "string",
    text: "string",
    ts: "string",
  });

export default Event("message")
  .data(message)

  .describe({
    description: "A message was sent to a channel",
    data: {
      channel: "Message channel",
    },
  });
