import { Event } from "../../src/event";

export default Event("new-email")
  .data({
    from: "string",
    subject: "string",
  })

  .meta({ threadId: "from" });
