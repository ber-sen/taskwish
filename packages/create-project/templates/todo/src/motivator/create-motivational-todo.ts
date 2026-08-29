import { Agent, Step } from "taskwish";

import { actor } from "./actor";

export const { createMotivationalTodo } = actor()
  .on("Command", "createMotivationalTodo")

  .input({ "completedTodoDescription?": "string" })

  .run(
    Agent({
      runtime: "codex",
      cwd: process.cwd(),
      model: process.env.CODEX_MODEL,
      reasoningEffort: process.env.CODEX_REASONING_EFFORT,
      permission: "reject_once",
    }),

    Step("generateTodoDescription", async function () {
      const completedTodo = this.input.completedTodoDescription
        ? `The user just completed: ${this.input.completedTodoDescription}`
        : "The user wants a useful next task.";
      const description = await this.agent.generate({
        prompt: [
          "Generate one concise, motivating todo description.",
          completedTodo,
          "Return only the todo description without quotes or commentary.",
        ].join("\n"),
      });
      const normalized = description.trim().replace(/^["']|["']$/g, "");
      if (!normalized) throw new Error("Codex returned an empty todo description.");
      return normalized;
    }),

    Step("addGeneratedTodo", function () {
      return this.actions.todos.addTodo({
        description: this.generateTodoDescription,
      });
    }),
  )

  .meta({
    description: "Ask Codex to generate and add a motivating next todo",
    input: {
      completedTodoDescription: {
        description: "Recently completed work that should inspire the next todo",
        example: "Write unit tests",
      },
    },
  });
