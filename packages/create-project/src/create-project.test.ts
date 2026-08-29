import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { CreateProject } from ".";

const temporaryDirectories: string[] = [];
const templateDirectory = join(import.meta.dir, "../templates");
const skillPath = join(import.meta.dir, "../../skill/SKILL.md");

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("CreateProject.createProject", () => {
  test.each([
    ["empty", "taskwish.ts", "Define and run your TaskWish actors here.", 0],
    ["todo", "src/todos/add-todo.ts", "addTodo", 2],
    [
      "customer-support",
      "src/support/open-case.ts",
      "this.actions.customers",
      3,
    ],
  ] as const)(
    "creates the %s TypeScript template",
    async (template, actionPath, actorSource, actorCount) => {
      const parent = await temporaryDirectory();
      const destination = join(parent, `My ${template} App`);

      const result = await CreateProject.createProject({
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
      const templateSource = await readFile(join(destination, actionPath), "utf8");

      expect(packageJson.name).toBe(`my-${template}-app`);
      expect(packageJson.dependencies.taskwish).toBe("^0.0.8");
      expect(templateSource).toContain(actorSource);
      expect(await readFile(join(destination, "taskwish.ts"), "utf8")).toBeTruthy();
      expect(result.template).toBe(template);
      expect(result.installed).toBe(false);
      expect(result.gitInitialized).toBe(false);
      expect(result.files).toContain(actionPath);
      expect(result.files).toContain("taskwish.ts");
      expect(result.files).toContain("SKILL.md");
      expect(result.files.filter((file) => file.endsWith("/actor.ts"))).toHaveLength(
        actorCount,
      );
    },
  );

  test("uses the empty template by default", async () => {
    const parent = await temporaryDirectory();
    const destination = join(parent, "defaults");

    const result = await CreateProject.createProject({
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
      CreateProject.createProject({
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
      CreateProject.createProject({
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
