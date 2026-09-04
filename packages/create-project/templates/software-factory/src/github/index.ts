import { actor } from "./github";
import { receiveIssueWebhook } from "./receive-issue-webhook";

export const { GitHub } = actor().service({ receiveIssueWebhook });
