import { test, expect } from "@playwright/test";

import {
  installMockAgentServer,
  LONG_STREAM_END,
  MOCK_AGENT_RESPONSES,
} from "./mock-agent-server";

const flows = [
  ["BasicAgentLoop", "Run basic agent loop", "Goal", "Prepare launch"],
  ["DebateLoop", "Run debate loop", "Question", "Should we ship?"],
  ["EnvironmentLoop", "Run environment loop", "Target", "3", 3],
  [
    "EvaluatorOptimizerLoop",
    "Run evaluator optimizer loop",
    "Task",
    "Improve the release notes",
  ],
  ["GoalDrivenLoop", "Run goal driven loop", "Goal", "Finish the launch"],
  ["HumanInTheLoop", "Run human in the loop", "Goal", "Deploy safely"],
  ["MemoryLoop", "Run memory loop", "Goal", "Remember preferences"],
  ["MultiAgentLoop", "Run multi agent loop", "Topic", "Launch strategy"],
  ["PlanExecuteLoop", "Run plan execute loop", "Goal", "Publish article"],
  [
    "PlanExecuteReplanLoop",
    "Run plan execute replan loop",
    "Goal",
    "Migrate database",
  ],
  ["ReActLoop", "Run react loop", "Question", "What should happen next?"],
  ["ReflectionLoop", "Run reflection loop", "Prompt", "Explain agents"],
  [
    "RetryErrorCorrectionLoop",
    "Run retry error correction loop",
    "Task",
    "Repair deployment",
  ],
  ["SelfAskLoop", "Run self ask loop", "Question", "Why is the sky blue?"],
  [
    "SupervisorWorkerLoop",
    "Run supervisor worker loop",
    "Task",
    "Prepare report",
  ],
  ["ToolCallingLoop", "Run tool calling loop", "Problem", "Add 20 and 22"],
  ["TreeSearchLoop", "Run tree search loop", "Goal", "Choose architecture"],
] as const;

for (const [
  actor,
  command,
  field,
  enteredValue,
  expectedValue = enteredValue,
] of flows) {
  test(`runs and renders every mocked response for ${actor}`, async ({
    page,
  }) => {
    const mockServer = await installMockAgentServer(page);
    await page.goto("/");
    await page.getByText(command, { exact: true }).click();
    await page.locator(`[name="${field.toLowerCase()}"]`).fill(enteredValue);
    await page.getByRole("button", { name: "Run" }).click();

    await expect(page.getByText(MOCK_AGENT_RESPONSES[actor])).toBeVisible();
    expect(mockServer.callFor(actor)).toMatchObject({
      actor,
      input: { [field.toLowerCase()]: expectedValue },
    });
  });
}

test("renders the complete mocked ACP event lifecycle", async ({ page }) => {
  await installMockAgentServer(page);
  await page.goto("/");
  await page.getByText("Run basic agent loop", { exact: true }).click();
  await page.getByLabel("Goal").fill("Exercise every ACP event");
  await page.getByRole("button", { name: "Run" }).click();

  for (const visibleText of [
    "Mocked BasicAgentLoop reasoning.",
    "Mock tool",
    "Mocked BasicAgentLoop tool output.",
    "Plan",
    "Plan update",
    "Plan removed",
    "Available commands update",
    "Current mode update",
    "Config option update",
    "Session info update",
    "42 tokens",
    "Compaction update",
    "Compaction summary chunk",
    "Mocked BasicAgentLoop response: next action selected.",
    LONG_STREAM_END,
    "End turn",
  ]) {
    await expect(page.getByText(visibleText).first()).toBeVisible();
  }
});
