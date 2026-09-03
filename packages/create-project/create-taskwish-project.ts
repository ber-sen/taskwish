#!/usr/bin/env bun

import { Terminal } from "@taskwish/terminal";

import { Scaffolder } from "./src/scaffolder";

Terminal.elicit(Scaffolder.createProject, {
  command: "bunx @taskwish/create-project",
  examples: [
    "bunx @taskwish/create-project",
    "bunx @taskwish/create-project my-app --template todo",
    "bunx @taskwish/create-project my-agents --template agent-loops",
    "bunx @taskwish/create-project my-workflow --template agent-graphs",
    "bunx @taskwish/create-project my-app --yes",
  ],
  input: {
    projectName: { positional: true },
    template: { short: "t" },
  },
  formatResult(result) {
    const nextSteps = [`cd ${result.relativeDirectory}`];
    if (!result.installed) nextSteps.push("bun install");
    nextSteps.push("bun start");

    return [
      `Created a new TaskWish project in ${result.directory}`,
      "",
      "Next steps:",
      ...nextSteps.map((step) => `  ${step}`),
    ].join("\n");
  },
});
