import z from "zod";
import { Event } from "../../src/event";

export const gmailNewEmail = Event("Gmail.newEmail").schema(
  z.object({ from: z.string(), subject: z.string(), message: z.string() })
);
