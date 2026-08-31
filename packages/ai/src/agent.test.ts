import { describe, expect, mock, test } from "bun:test";
import { Actor, Step } from "@taskwish/core";
import { MockLanguageModelV3 } from "ai/test";

import { Agent } from "./agent";
import { Tool } from "./tool";

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: 0,
    cacheWrite: 0,
  },
  outputTokens: {
    total: 1,
    text: 1,
    reasoning: 0,
  },
};

describe("Tool", () => {
  test("is directly executable", async () => {
    const add = Tool("add", {
      description: "Add two numbers",
      input: { left: "number", right: "number" },
      run() {
        return this.input.left + this.input.right;
      },
    });

    expect(await add({ left: 2, right: 3 })).toBe(5);
    expect(add.name).toBe("add");
    expect(add.description).toBe("Add two numbers");
  });
});

describe("Agent AI SDK runtime", () => {
  test("defaults to AI SDK and executes named TaskWish tools", async () => {
    const toolInputs: Array<{ left: number; right: number }> = [];
    const model = new MockLanguageModelV3({
      doGenerate: [
        {
          content: [
            {
              type: "tool-call" as const,
              toolCallId: "call-1",
              toolName: "add",
              input: JSON.stringify({ left: 2, right: 3 }),
            },
          ],
          finishReason: { unified: "tool-calls" as const, raw: undefined },
          usage,
          warnings: [],
        },
        {
          content: [{ type: "text" as const, text: "The answer is 5." }],
          finishReason: { unified: "stop" as const, raw: undefined },
          usage,
          warnings: [],
        },
      ],
    });
    const { actor } = Actor("Calculator");
    const { calculate } = actor()
      .on("Command", "calculate")

      .run(
        Tool("add", {
          description: "Add two numbers",
          input: { left: "number", right: "number" },
          run() {
            toolInputs.push(this.input);
            return this.input.left + this.input.right;
          },
        }),

        Agent({ model, tools: ["add"] }),

        Step("answer", function () {
          expect(this.agent.runtime).toBe("ai-sdk");
          return this.agent.generate({
            prompt: "What is 2 + 3? Use the add tool.",
          });
        }),
      );

    await expect(calculate()).resolves.toBe("The answer is 5.");
    expect(toolInputs).toEqual([{ left: 2, right: 3 }]);
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(model.doGenerateCalls[0]?.tools?.[0]).toMatchObject({
      name: "add",
      description: "Add two numbers",
    });
  });

  test("reports an unregistered named tool", async () => {
    const model = new MockLanguageModelV3();
    const { actor } = Actor("MissingTool");
    const { runAgent } = actor()
      .on("Command", "runAgent")

      .run(
        Agent({ model, tools: ["missing"] }),

        Step("answer", function () {
          return this.agent.generate({ prompt: "Hello" });
        }),
      );

    await expect(runAgent()).rejects.toThrow(
      'Agent tool "missing" was not registered',
    );
  });

  test("preserves an explicitly selected Codex runtime", async () => {
    const { actor } = Actor("ExplicitRuntime");
    const { inspectRuntime } = actor()
      .on("Command", "inspectRuntime")

      .run(
        Agent({
          runtime: "codex",
          cwd: process.cwd(),
          permission: "reject_once",
        }),

        Step("runtime", function () {
          return this.agent.runtime;
        }),
      );

    await expect(inspectRuntime()).resolves.toBe("codex");
  });

  test("exposes named agents under their configured scope names", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: "text", text: "A plan" }],
        finishReason: { unified: "stop", raw: undefined },
        usage,
        warnings: [],
      },
    });
    const { actor } = Actor("NamedAgent");
    const { createPlan } = actor()
      .on("Command", "createPlan")

      .run(
        Agent("planner", { model }),

        Step("plan", function () {
          expect(this.planner.name).toBe("planner");
          return this.planner.generate({ prompt: "Create a plan" });
        }),
      );

    await expect(createPlan()).resolves.toBe("A plan");
  });

  test("ctx overrides default and named agents for tests", async () => {
    const model = new MockLanguageModelV3();
    const defaultGenerate = mock(async () => "mock default");
    const plannerGenerate = mock(async () => "mock plan");
    const { actor } = Actor("MockedAgents");
    const { runAgents } = actor()
      .on("Command", "runAgents")

      .run(
        Agent({ model }),

        Agent("planner", { model }),

        Step("generate", async function () {
          return {
            default: await this.agent.generate({ prompt: "default" }),
            plan: await this.planner.generate({ prompt: "plan" }),
          };
        }),
      );

    await expect(
      runAgents
        .ctx({
          agent: { generate: defaultGenerate },
          planner: { generate: plannerGenerate },
        })
        .run(),
    ).resolves.toEqual({
      default: "mock default",
      plan: "mock plan",
    });
    expect(defaultGenerate).toHaveBeenCalledWith({ prompt: "default" });
    expect(plannerGenerate).toHaveBeenCalledWith({ prompt: "plan" });
    expect(model.doGenerateCalls).toHaveLength(0);
  });
});
