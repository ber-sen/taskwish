import z from "zod";
import { Event } from "../../src/event";

export default Event("zod-new-email")
  .data(
    z.object({ from: z.string(), subject: z.string(), message: z.string() })
  )

  .attr({ threadId: "from" });
