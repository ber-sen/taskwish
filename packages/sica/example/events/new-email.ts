import { Event } from "../../src/event";

const a = Event("new-email")
  .data({
    from: "string",
    subject: "string",
  })

  .attr({ threadId: "from" });
