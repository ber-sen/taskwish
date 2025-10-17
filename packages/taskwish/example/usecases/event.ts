import { Event } from "../../src/event";

export const gmailNewEmail = Event("Gmail.newEmail", {
  from: "string",
  subject: "string",
});
