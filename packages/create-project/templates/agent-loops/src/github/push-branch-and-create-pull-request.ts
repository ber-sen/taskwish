import { Step } from "taskwish";

import { actor } from "./github";

type GitHubPullRequest = {
  number: number;
  html_url: string;
  title: string;
};

async function runGit(directory: string, args: string[]): Promise<string> {
  const child = Bun.spawn(["git", ...args], {
    cwd: directory,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(`git ${args[0]} failed: ${stderr.trim() || stdout.trim()}`);
  }
  return stdout.trim();
}

export const { pushBranchAndCreatePullRequest } = actor()
  .on("Command", "pushBranchAndCreatePullRequest")

  .input({
    owner: "string",
    repository: "string",
    branch: "string",
    title: "string",
    "body?": "string",
    "base?": "string",
    "directory?": "string",
    "remote?": "string",
  })

  .run(
    Step("validateConfiguration", function () {
      if (!process.env.GITHUB_TOKEN) {
        throw new Error("GITHUB_TOKEN is required to create a pull request.");
      }
      if (this.input.branch === (this.input.base ?? "main")) {
        throw new Error(
          "The pull request branch must differ from its base branch."
        );
      }
      return {
        directory: this.input.directory ?? process.cwd(),
        remote: this.input.remote ?? "origin",
        base: this.input.base ?? "main",
      };
    }),

    Step("pushBranch", function () {
      return runGit(this.validateConfiguration.directory, [
        "push",
        "--set-upstream",
        this.validateConfiguration.remote,
        this.input.branch,
      ]);
    }),

    Step("createPullRequest", async function () {
      await this.pushBranch;
      const token = process.env.GITHUB_TOKEN;
      if (!token)
        throw new Error("GITHUB_TOKEN is required to create a pull request.");

      const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
      const response = await fetch(
        `${apiUrl}/repos/${encodeURIComponent(
          this.input.owner
        )}/${encodeURIComponent(this.input.repository)}/pulls`,
        {
          method: "POST",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({
            title: this.input.title,
            body: this.input.body ?? "",
            head: this.input.branch,
            base: this.validateConfiguration.base,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `GitHub pull request creation failed (${
            response.status
          }): ${await response.text()}`
        );
      }

      const pullRequest = (await response.json()) as Partial<GitHubPullRequest>;
      if (
        typeof pullRequest.number !== "number" ||
        typeof pullRequest.html_url !== "string" ||
        typeof pullRequest.title !== "string"
      ) {
        throw new Error("GitHub returned an invalid pull request response.");
      }

      return {
        number: pullRequest.number,
        url: pullRequest.html_url,
        title: pullRequest.title,
        branch: this.input.branch,
        base: this.validateConfiguration.base,
      };
    })
  )

  .meta({
    description: "Push a local branch and create a GitHub pull request",
    input: {
      owner: { description: "GitHub repository owner", example: "taskwish" },
      repository: {
        description: "GitHub repository name",
        example: "taskwish",
      },
      branch: {
        description: "Local branch to push",
        example: "feature/event-loop",
      },
      title: {
        description: "Pull request title",
        example: "Add an event-driven loop",
      },
      body: { description: "Pull request description" },
      base: { description: "Base branch; defaults to main", example: "main" },
      directory: {
        description:
          "Local Git working directory; defaults to the current directory",
      },
      remote: {
        description: "Git remote; defaults to origin",
        example: "origin",
      },
    },
  });
