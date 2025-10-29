import { Event } from "../../src/event";

export const gmailNewEmail = Event("new email").data({
  from: "string",
  subject: "string",
});
