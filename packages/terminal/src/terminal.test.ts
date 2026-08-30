import { describe, expect, test } from "bun:test";
import { Readable, Writable } from "node:stream";

import { TW } from "@taskwish/core";

import { TASKWISH_LOGO, Terminal } from ".";

function terminalAction() {
  const calls: Record<string, unknown>[] = [];
  const action = Object.assign(
    async (input: Record<string, unknown>) => {
      calls.push(input);
      return { name: input.projectName, installed: input.install };
    },
    {
      [TW.Meta]: {
        description: "Create a project",
        elicit: {
          title: "Create project",
        },
        input: {
          projectName: {
            description: "Project directory",
            elicit: { default: "my-app" },
          },
          template: {
            description: "Starter template",
            elicit: {
              default: "empty",
              options: [
                { value: "empty", label: "Empty" },
                { value: "todo", label: "Todo" },
              ],
            },
          },
          install: {
            description: "Install dependencies",
            elicit: { default: true },
          },
          secret: { elicit: { hidden: true } },
        },
      },
      [TW.InputSchema]: {
        projectName: "string",
        "template?": "string",
        "install?": "boolean",
        "secret?": "string",
      },
    },
  );

  return { action, calls };
}

function terminalOptions() {
  return {
    command: "create-project",
    examples: ["create-project my-app --yes"],
    formatResult(result: { name: unknown }) {
      return `Created ${result.name}`;
    },
    input: {
      projectName: { positional: true },
      template: { short: "t" },
    },
  } as const;
}

describe("Terminal.elicit", () => {
  test("maps positional arguments, options, and boolean negation to action input", async () => {
    const { action, calls } = terminalAction();
    const output = capture();
    let exitCode: number | undefined;

    const result = await Terminal.elicit(action, {
      ...terminalOptions(),
      args: ["demo", "-t", "todo", "--no-install"],
      interactive: false,
      stdout: output.stream,
      stderr: output.stream,
      setExitCode: (code) => (exitCode = code),
    });

    expect(result).toEqual({ name: "demo", installed: false });
    expect(calls).toEqual([
      { projectName: "demo", template: "todo", install: false },
    ]);
    expect(output.text()).toContain("└  Created demo");
    expect(exitCode).toBeUndefined();
  });

  test("accepts defaults with --yes", async () => {
    const { action, calls } = terminalAction();
    const output = capture();

    await Terminal.elicit(action, {
      ...terminalOptions(),
      args: ["--yes"],
      interactive: false,
      stdout: output.stream,
      stderr: output.stream,
      setExitCode: () => {},
    });

    expect(calls).toEqual([
      { projectName: "my-app", template: "empty", install: true },
    ]);
  });

  test("shows the Taskwish logo and Clack-style colors in an interactive terminal", async () => {
    const { action } = terminalAction();
    const output = capture();

    await Terminal.elicit(action, {
      ...terminalOptions(),
      args: ["--yes"],
      interactive: true,
      color: true,
      stdout: output.stream,
      stderr: output.stream,
      setExitCode: () => {},
    });

    const plainOutput = output.text().replaceAll(/\x1b\[[0-9;]*m/g, "");
    expect(plainOutput).toContain(TASKWISH_LOGO.trim().split("\n")[0]!);
    expect(output.text()).toContain("\x1b[38;5;244m");
    expect(output.text()).toContain("\x1b[30m└\x1b[0m");
    expect(output.text()).toContain(
      "\x1b[38;2;0;223;163mCreated my-app\x1b[0m",
    );
  });

  test("reads metadata from bare action output", async () => {
    const { action, calls } = terminalAction();
    const bareAction = Object.assign(
      (input: Record<string, unknown>) => action(input),
      {
        __taskwish: {
          meta: action[TW.Meta],
          inputSchema: action[TW.InputSchema],
        },
      },
    );
    const output = capture();

    await Terminal.elicit(bareAction, {
      ...terminalOptions(),
      args: ["--yes"],
      interactive: false,
      stdout: output.stream,
      stderr: output.stream,
      setExitCode: () => {},
    });

    expect(calls).toEqual([
      { projectName: "my-app", template: "empty", install: true },
    ]);
  });

  test("uses an action's unlogged stream when available", async () => {
    let directCalls = 0;
    const action = Object.assign(
      async () => {
        directCalls++;
        return "logged";
      },
      {
        [TW.Meta]: { description: "Quiet action" },
        [TW.InputSchema]: {},
        [Symbol.for("TW.RawStream")]: async function* () {
          yield { trace: "ignored" };
          return "quiet";
        },
      },
    );
    const output = capture();

    const result = await Terminal.elicit(action, {
      args: [],
      interactive: false,
      stdout: output.stream,
      stderr: output.stream,
      setExitCode: () => {},
    });

    expect(result).toBe("quiet");
    expect(directCalls).toBe(0);
    expect(output.text()).not.toContain("ignored");
  });

  test("generates help from action metadata", async () => {
    const { action, calls } = terminalAction();
    const output = capture();

    await Terminal.elicit(action, {
      ...terminalOptions(),
      args: ["--help"],
      interactive: false,
      stdout: output.stream,
      stderr: output.stream,
      setExitCode: () => {},
    });

    expect(output.text()).toContain("Usage: create-project [project-name] [options]");
    expect(output.text()).toContain("-t, --template <value>");
    expect(output.text()).toContain("--install, --no-install");
    expect(output.text()).toContain("create-project my-app --yes");
    expect(calls).toHaveLength(0);
  });

  test("prompts for missing values using readline", async () => {
    const { action, calls } = terminalAction();
    const output = capture();

    await Terminal.elicit(action, {
      ...terminalOptions(),
      args: [],
      stdin: Readable.from(["custom\n2\nn\n"]),
      interactive: true,
      color: true,
      stdout: output.stream,
      stderr: output.stream,
      setExitCode: () => {},
    });

    expect(calls).toEqual([
      { projectName: "custom", template: "todo", install: false },
    ]);
    const text = output.text();
    const plainText = text.replaceAll(/\x1b\[[0-9;]*m/g, "");
    expect(plainText).toContain("┌  Create project");
    expect(plainText).toContain("◆  Starter template");
    expect(plainText).toContain("Install dependencies? (Y/n)");
    expect(text).toContain("\x1b[30m┌\x1b[0m");
    expect(text).toContain("\x1b[38;2;0;223;163m◆\x1b[0m");
    expect(text).not.toContain("\x1b[36m");
  });

  test("reports invalid input without invoking the action", async () => {
    const { action, calls } = terminalAction();
    const output = capture();
    let exitCode: number | undefined;

    const result = await Terminal.elicit(action, {
      ...terminalOptions(),
      args: ["demo", "--template", "unknown", "--install"],
      interactive: false,
      stdout: output.stream,
      stderr: output.stream,
      setExitCode: (code) => (exitCode = code),
    });

    expect(result).toBeUndefined();
    expect(calls).toHaveLength(0);
    expect(output.text()).toContain(
      'Invalid value "unknown" for --template. Choose empty, todo.',
    );
    expect(exitCode).toBe(1);
  });
});

function capture(): { stream: Writable; text(): string } {
  const chunks: string[] = [];
  return {
    stream: new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(String(chunk));
        callback();
      },
    }),
    text: () => chunks.join(""),
  };
}
