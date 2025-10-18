import { Event } from "../../../../src";

export default Event("message", {
  type: "'message'",
  channel: "string",
  user: "string",
  text: "string",
  ts: "string",
})
