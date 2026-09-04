import { actor } from "./github";
import { pushBranchAndCreatePullRequest } from "./push-branch-and-create-pull-request";
import { receiveIssueWebhook } from "./receive-issue-webhook";

export const { GitHub } = actor().service({
  receiveIssueWebhook,
  pushBranchAndCreatePullRequest,
});
