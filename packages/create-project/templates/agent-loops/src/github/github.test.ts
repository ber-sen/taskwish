import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFetchHandler, createNodeRegistry } from "@taskwish/server";
import { TW } from "taskwish";

import { GitHub } from ".";

test("exports the GitHub integration actor", () => {
  expect(GitHub[TW.Name]).toBe("GitHub");
  expect(typeof GitHub.receiveIssueWebhook).toBe("function");
  expect(typeof GitHub.pushBranchAndCreatePullRequest).toBe("function");
  const route = GitHub.receiveIssueWebhook[TW.Meta].route;
  expect(route[0]).toBe("POST");
  expect(route[1]).toBe("/integrations/github/issues");
});

test("receives an issue webhook and emits GitHub::IssueOpened", async () => {
  const apiKey = "test-api-key";
  const fetchIntegration = createFetchHandler(
    createNodeRegistry([Promise.resolve({ GitHub })]),
    { apiKey }
  );
  const response = await fetchIntegration(
    new Request("http://localhost/integrations/github/issues", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "opened",
        issue: {
          number: 42,
          title: "Add an event-driven agent",
          body: "React to new issues with a concrete next action.",
          html_url: "https://github.com/taskwish/taskwish/issues/42",
        },
        repository: {
          name: "taskwish",
          owner: { login: "taskwish" },
        },
      }),
    })
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    event: "GitHub::IssueOpened",
    data: {
      owner: "taskwish",
      repository: "taskwish",
      number: 42,
      url: "https://github.com/taskwish/taskwish/issues/42",
    },
  });
});

test("requires credentials before pushing a branch", async () => {
  const previousToken = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;

  try {
    await expect(
      GitHub.pushBranchAndCreatePullRequest({
        owner: "taskwish",
        repository: "taskwish",
        branch: "feature/event-loop",
        title: "Add an event-driven loop",
      })
    ).rejects.toThrow("GITHUB_TOKEN is required");
  } finally {
    restoreEnvironment("GITHUB_TOKEN", previousToken);
  }
});

test("pushes a branch and creates a pull request", async () => {
  const root = await mkdtemp(join(tmpdir(), "taskwish-github-test-"));
  const remote = join(root, "remote.git");
  const checkout = join(root, "checkout");
  const previousToken = process.env.GITHUB_TOKEN;
  const previousApiUrl = process.env.GITHUB_API_URL;
  const previousFetch = globalThis.fetch;
  let apiRequest:
    | { url: string; authorization: string | null; body: unknown }
    | undefined;

  try {
    await runGit(root, ["init", "--bare", remote]);
    await runGit(root, ["init", "--initial-branch=main", checkout]);
    await runGit(checkout, ["config", "user.email", "agent-loops@example.com"]);
    await runGit(checkout, ["config", "user.name", "Agent Loops"]);
    await writeFile(join(checkout, "README.md"), "# Test repository\n");
    await runGit(checkout, ["add", "README.md"]);
    await runGit(checkout, ["commit", "-m", "Initial commit"]);
    await runGit(checkout, ["remote", "add", "origin", remote]);
    await runGit(checkout, ["push", "origin", "main"]);
    await runGit(checkout, ["checkout", "-b", "feature/event-loop"]);
    await writeFile(
      join(checkout, "event-loop.md"),
      "Event loop implementation\n"
    );
    await runGit(checkout, ["add", "event-loop.md"]);
    await runGit(checkout, ["commit", "-m", "Add event loop"]);

    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_API_URL = "https://github.example.test/api/v3";
    globalThis.fetch = (async (input, init) => {
      const headers = new Headers(init?.headers);
      apiRequest = {
        url: String(input),
        authorization: headers.get("Authorization"),
        body: JSON.parse(String(init?.body)),
      };
      return Response.json(
        {
          number: 17,
          html_url: "https://github.example.test/taskwish/taskwish/pull/17",
          title: "Add an event-driven loop",
        },
        { status: 201 }
      );
    }) as typeof fetch;

    await expect(
      GitHub.pushBranchAndCreatePullRequest({
        owner: "taskwish",
        repository: "taskwish",
        branch: "feature/event-loop",
        title: "Add an event-driven loop",
        body: "Implements the GitHub event flow.",
        directory: checkout,
      })
    ).resolves.toEqual({
      number: 17,
      url: "https://github.example.test/taskwish/taskwish/pull/17",
      title: "Add an event-driven loop",
      branch: "feature/event-loop",
      base: "main",
    });

    expect(
      await runGit(root, [
        "--git-dir",
        remote,
        "rev-parse",
        "refs/heads/feature/event-loop",
      ])
    ).toMatch(/^[0-9a-f]{40,64}$/);
    expect(apiRequest).toEqual({
      url: "https://github.example.test/api/v3/repos/taskwish/taskwish/pulls",
      authorization: "Bearer test-token",
      body: {
        title: "Add an event-driven loop",
        body: "Implements the GitHub event flow.",
        head: "feature/event-loop",
        base: "main",
      },
    });
  } finally {
    globalThis.fetch = previousFetch;
    restoreEnvironment("GITHUB_TOKEN", previousToken);
    restoreEnvironment("GITHUB_API_URL", previousApiUrl);
    await rm(root, { recursive: true, force: true });
  }
});

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
  if (exitCode !== 0) throw new Error(stderr || stdout);
  return stdout.trim();
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
