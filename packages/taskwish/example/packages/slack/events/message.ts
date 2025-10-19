import { Event } from "../../../../src";

export default Event("message")
  .schema({
    type: "'message'",
    channel: "string",
    user: "string",
    text: "string",
    ts: "string",
  })

  .describe({
    description: "New slack message",
    data: {
      channel: "Message channel",
    },
  });
