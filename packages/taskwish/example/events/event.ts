import { Event } from "../../src/event";

export const gmailNewEmail = Event("Gmail.newEmail").data({
  from: "string",
  subject: "string",
});
