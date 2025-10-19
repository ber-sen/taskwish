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
    description: "New slack message event",
    data: {
      channel: "Message channel",
    },
  });
