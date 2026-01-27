import { Event } from "../../src/event/event";

export default Event("new-email").data({
  from: "string",
  subject: "string",
});
