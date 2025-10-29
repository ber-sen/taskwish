import z from "zod";
import { Event } from "../../src/event";

export const gmailNewEmail = Event("new email").data(
  z.object({ from: z.string(), subject: z.string(), message: z.string() })
);
