import { Event } from "../../src/event";

export const gmailNewEmail = Event("Gmail.newEmail").schema({
  from: "string",
  subject: "string",
});
