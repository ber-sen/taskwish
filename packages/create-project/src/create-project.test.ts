import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TW } from "taskwish";

import { Scaffolder } from ".";

const temporaryDirectories: string[] = [];
const templateDirectory = join(import.meta.dir, "../templates");
const skillPath = join(import.meta.dir, "../../skill/SKILL.md");
const projectSkillPath = join(".agents", "skills", "taskwish", "SKILL.md");

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("Scaffolder.createProject", () => {
  test("uses the Scaffolder action namespace", () => {
    expect(Scaffolder.createProject[TW.Name]).toBe(
      "Scaffolder::createProject",
    );
  });

  test.each([
    [
      "empty",
      "src/greeter/greet.ts",
      "greet",
      ["Greeter"],
      "test/greeter.test.ts",
    ],
    [
      "todo",
      "src/todos/add-todo.ts",
      "addTodo",
      ["Motivator", "Todos"],
      "test/todo.test.ts",
    ],
  ] as const)(
    "creates the %s TypeScript template",
    async (template, actionPath, actorSource, actorNames, testPath) => {
      const parent = await temporaryDirectory();
      const destination = join(parent, `My ${template} App`);

      const result = await Scaffolder.createProject({
        projectName: destination,
        template,
        install: false,
        git: false,
        templateDirectory,
        skillPath,
      });

      const packageJson = JSON.parse(
        await readFile(join(destination, "package.json"), "utf8"),
      );
      const templatePackageJson = JSON.parse(
        await readFile(
          join(templateDirectory, template, "package.json"),
          "utf8",
        ),
      );
      const templateSource = await readFile(join(destination, actionPath), "utf8");
      const entrypoint = await readFile(join(destination, "taskwish.ts"), "utf8");
      const canonicalSkill = await readFile(skillPath, "utf8");
      const agentInstructions = await readFile(
        join(destination, "AGENTS.md"),
        "utf8",
      );

      expect(packageJson.name).toBe(`my-${template}-app`);
      expect(packageJson.scripts.test).toBe("bun test");
      expect(templatePackageJson.workspaces).toEqual(["../../../*"]);
      expect(packageJson.workspaces).toBeUndefined();
      expect(templatePackageJson.dependencies.taskwish).toBe("workspace:*");
      expect(templatePackageJson.dependencies["@taskwish/console"]).toBe(
        "workspace:*",
      );
      expect(templatePackageJson.dependencies["@taskwish/server"]).toBe(
        "workspace:*",
      );
      expect(packageJson.dependencies.taskwish).toBe("^0.0.8");
      expect(packageJson.dependencies["@taskwish/console"]).toBe("^0.0.1");
      expect(packageJson.dependencies["@taskwish/server"]).toBe("^0.0.1");
      expect(templateSource).toContain(actorSource);
      expect(entrypoint).toContain('import { Console } from "@taskwish/console"');
      expect(entrypoint).toContain('import { Server } from "@taskwish/server"');
      expect(entrypoint).toContain("await Server(");
      expect(entrypoint).toContain("apps: [Console()]");
      expect(
        await readFile(
          join(templateDirectory, template, projectSkillPath),
          "utf8",
        ),
      ).toBe(canonicalSkill);
      expect(await readFile(join(destination, projectSkillPath), "utf8")).toBe(
        canonicalSkill,
      );
      await expect(
        readFile(join(destination, "SKILL.md"), "utf8"),
      ).rejects.toThrow();
      expect(agentInstructions).toContain("This project uses TaskWish");
      expect(agentInstructions).toContain(
        "`.agents/skills/taskwish/SKILL.md`",
      );
      const expectedWorkspace = `workspace: [${actorNames.join(", ")}]`;
      expect(entrypoint).toContain(expectedWorkspace);
      expect(entrypoint).not.toContain(`workspace: [{ ${actorNames.join(", ")} }]`);
      if (template === "empty") {
        expect(entrypoint).not.toContain("Greeter.greet");
      }
      if (template === "todo") {
        const completeTodoSource = await readFile(
          join(destination, "src/todos/complete-todo.ts"),
          "utf8",
        );
        const motivatorSource = await readFile(
          join(destination, "src/motivator/create-motivational-todo.ts"),
          "utf8",
        );
        const motivatorListenerSource = await readFile(
          join(destination, "src/motivator/on-todo-completed.ts"),
          "utf8",
        );
        expect(completeTodoSource).toContain('.addStateCommand("item"');
        expect(completeTodoSource).toContain("suggestions: {");
        expect(completeTodoSource).toContain('$: "Todos::listTodos"');
        expect(completeTodoSource).toContain(
          'this.signal("Todos::TodoCompleted"',
        );
        expect(motivatorSource).toContain('runtime: "codex"');
        expect(motivatorSource).toContain("this.agent.generate({");
        expect(motivatorSource).toContain("this.actions.todos.addTodo({");
        expect(motivatorListenerSource).toContain(
          '.on("Todos::TodoCompleted")',
        );
        expect(entrypoint).not.toContain("Reminders");
      }
      for (const actorName of actorNames) {
        expect(entrypoint).toContain(actorName);
        expect(entrypoint).not.toContain(`await ${actorName}.`);
      }
      expect(entrypoint).not.toContain("console.log(");
      expect(result.template).toBe(template);
      expect(result.installed).toBe(false);
      expect(result.gitInitialized).toBe(false);
      expect(result.files).toContain(actionPath);
      expect(result.files).toContain(testPath);
      expect(result.files.some((file) => file.startsWith("node_modules/"))).toBe(
        false,
      );
      expect(result.files).not.toContain("bun.lock");
      expect(result.files.some((file) => file.startsWith("state/"))).toBe(false);
      expect(result.files).toContain("taskwish.ts");
      expect(result.files).toContain("AGENTS.md");
      expect(result.files).toContain(projectSkillPath);
      expect(
        result.files.filter((file) => file === projectSkillPath),
      ).toHaveLength(1);
      const actionFiles = result.files.filter(
        (file) =>
          file.startsWith("src/") &&
          file.endsWith(".ts") &&
          !file.endsWith("/actor.ts") &&
          !file.endsWith("/index.ts"),
      );
      const actionStepCounts: number[] = [];
      for (const actionFile of actionFiles) {
        const actionSource = await readFile(join(destination, actionFile), "utf8");
        const stepNames = Array.from(
          actionSource.matchAll(/Step\("([^"]+)"/g),
          (match) => match[1]!,
        );
        expect(stepNames.length).toBeGreaterThan(0);
        expect(actionSource).toContain(".meta({");
        expect(actionSource).toContain("description:");
        for (const stepName of stepNames) {
          expect(stepName).toMatch(/^[a-z][a-zA-Z0-9]*$/);
        }
        actionStepCounts.push(stepNames.length);
      }
      expect(actionStepCounts.some((count) => count > 1)).toBe(true);
      expect(result.files.filter((file) => file.endsWith("/actor.ts"))).toHaveLength(
        actorNames.length,
      );
    },
  );

  test("uses the empty template by default", async () => {
    const parent = await temporaryDirectory();
    const destination = join(parent, "defaults");

    const result = await Scaffolder.createProject({
      projectName: destination,
      install: false,
      git: false,
      templateDirectory,
      skillPath,
    });

    expect(result.template).toBe("empty");
  });

  test("refuses to write into a non-empty directory", async () => {
    const destination = await temporaryDirectory();
    await writeFile(join(destination, "keep.txt"), "do not overwrite");

    await expect(
      Scaffolder.createProject({
        projectName: destination,
        template: "empty",
        install: false,
        git: false,
        templateDirectory,
        skillPath,
      }),
    ).rejects.toThrow("the directory is not empty");
    expect(await readFile(join(destination, "keep.txt"), "utf8")).toBe(
      "do not overwrite",
    );
  });

  test("rejects unknown templates", async () => {
    const parent = await temporaryDirectory();

    await expect(
      Scaffolder.createProject({
        projectName: join(parent, "invalid"),
        template: "not-a-template",
        install: false,
        git: false,
        templateDirectory,
        skillPath,
      }),
    ).rejects.toThrow('Unknown template "not-a-template"');
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "taskwish-create-project-"));
  temporaryDirectories.push(directory);
  return directory;
}
