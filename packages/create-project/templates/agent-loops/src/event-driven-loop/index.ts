import { actor } from "./event-driven-loop";
import { onGitHubIssueOpened } from "./on-github-issue-opened";

export const { EventDrivenLoop } = actor().service({ onGitHubIssueOpened });
