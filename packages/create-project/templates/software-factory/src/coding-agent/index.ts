import { actor } from "./coding-agent";
import { onGitHubIssueOpened } from "./on-github-issue-opened";

export const { CodingAgent } = actor().service({ onGitHubIssueOpened });
