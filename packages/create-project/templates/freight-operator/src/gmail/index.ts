import { actor } from "./gmail";
import { getGmailMessage } from "./get-gmail-message";

export const { Gmail } = actor().service({ getGmailMessage });
