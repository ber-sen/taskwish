import { actor } from "./emails";
import { readEmail } from "./read-email";

export const { Emails } = actor().service({ readEmail });
