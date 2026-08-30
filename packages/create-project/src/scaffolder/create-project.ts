import { spawn } from "node:child_process";
import { copyFileSync, realpathSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

import { Step } from "taskwish";
import { Logger } from "@taskwish/wire";

import { actor } from "./actor";

export const TEMPLATE_NAMES = ["empty", "todo"] as const;

export type TemplateName = (typeof TEMPLATE_NAMES)[number];

const PROJECT_SKILL_PATH = join(".agents", "skills", "taskwish", "SKILL.md");
const silentLogger = {
  log() {},
  info() {},
  error() {},
};

export type CreateProjectOptions = {
  projectName: string;
  template?: TemplateName;
  install?: boolean;
  git?: boolean;
  templateDirectory?: string;
  skillPath?: string;
};

export type CreateProjectResult = {
  directory: string;
  relativeDirectory: string;
  projectName: string;
  template: TemplateName;
  installed: boolean;
  gitInitialized: boolean;
  files: string[];
};

type TemplatePackageJson = {
  name: string;
  version: string;
  private: boolean;
  type: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

type TemplateVersions = Record<string, string>;

export const { createProject } = actor()
  .use(Logger(silentLogger))

  .on("Command", "createProject")

  .input({
    projectName: "string",
    "template?": "string",
    "install?": "boolean",
    "git?": "boolean",
    "templateDirectory?": "string",
    "skillPath?": "string",
  })

  .run(
    Step("resolveProject", async function () {
      const template = this.input.template ?? "empty";
      if (template !== "empty" && template !== "todo") {
        throw new Error(
          `Unknown template "${template}". Choose empty, todo.`,
        );
      }

      const directory = resolve(this.input.projectName);
      const projectName = basename(directory)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^[._-]+|[._-]+$/g, "");
      if (!projectName) {
        throw new Error(`Cannot derive a package name from ${directory}.`);
      }

      return {
        directory,
        relativeDirectory: relative(process.cwd(), directory) || ".",
        projectName,
        template,
        install: this.input.install ?? true,
        git: this.input.git ?? true,
        templateDirectory:
          this.input.templateDirectory ?? (await defaultTemplateDirectory()),
        skillPath: this.input.skillPath ?? (await defaultSkillPath()),
      };
    }),

    Step("prepareDirectory", async function () {
      const directory = this.resolveProject.directory;

      try {
        const details = await stat(directory);
        if (!details.isDirectory()) {
          throw new Error(
            `Cannot create a project at ${directory}: it is not a directory.`,
          );
        }

        if ((await readdir(directory)).length > 0) {
          throw new Error(
            `Cannot create a project at ${directory}: the directory is not empty.`,
          );
        }
      } catch (error) {
        if (!isMissingFileError(error)) throw error;
      }

      await mkdir(directory, { recursive: true });
      return directory;
    }),

    Step("copyFiles", async function () {
      const project = this.resolveProject;
      const files = await copyTemplateDirectory(
        join(project.templateDirectory, project.template),
        project.directory,
      );
      const projectSkillPath = join(project.directory, PROJECT_SKILL_PATH);
      await mkdir(dirname(projectSkillPath), { recursive: true });
      copyFileSync(project.skillPath, projectSkillPath);
      if (!files.includes(PROJECT_SKILL_PATH)) files.push(PROJECT_SKILL_PATH);
      return files;
    }),

    Step("configurePackage", async function () {
      const project = this.resolveProject;
      const versionsPath = join(project.templateDirectory, "versions.json");
      let versions: TemplateVersions;
      try {
        versions = JSON.parse(
          await readFile(versionsPath, "utf8"),
        ) as TemplateVersions;
      } catch (error) {
        if (isMissingFileError(error)) {
          throw new Error(
            `Template dependency versions not found: ${versionsPath}`,
          );
        }
        throw error;
      }

      const packageJsonPath = join(project.directory, "package.json");
      const packageJson = JSON.parse(
        await readFile(packageJsonPath, "utf8"),
      ) as TemplatePackageJson;
      if (packageJson.name !== "taskwish-project") {
        throw new Error(
          `Template package.json is missing its project name placeholder.`,
        );
      }

      await writeFile(
        packageJsonPath,
        `${JSON.stringify(
          {
            name: project.projectName,
            version: packageJson.version,
            private: packageJson.private,
            type: packageJson.type,
            scripts: packageJson.scripts,
            dependencies: resolveWorkspaceVersions(
              packageJson.dependencies,
              versions,
            ),
            devDependencies: resolveWorkspaceVersions(
              packageJson.devDependencies,
              versions,
            ),
          },
          null,
          2,
        )}\n`,
      );
      return packageJsonPath;
    }),

    Step("installDependencies", async function () {
      if (this.resolveProject.install) {
        await runCommand(["bun", "install"], this.resolveProject.directory);
      }
      return this.resolveProject.install;
    }),

    Step("initializeRepository", async function () {
      if (this.resolveProject.git) {
        await runCommand(["git", "init"], this.resolveProject.directory);
      }
      return this.resolveProject.git;
    }),

    Step("project", function () {
      return {
        directory: this.resolveProject.directory,
        relativeDirectory: this.resolveProject.relativeDirectory,
        projectName: this.resolveProject.projectName,
        template: this.resolveProject.template,
        installed: this.installDependencies,
        gitInitialized: this.initializeRepository,
        files: this.copyFiles,
      };
    }),
  )

  .meta({
    description: "Create a fresh TypeScript TaskWish project",
    elicit: {
      title: "Create a new TaskWish project",
    },
    input: {
      projectName: {
        description: "Directory where the project will be created",
        example: "my-taskwish-app",
        elicit: {
          label: "Project directory",
          default: "my-taskwish-app",
        },
      },
      template: {
        description: "Starter project to generate",
        example: "empty",
        elicit: {
          label: "Select a template",
          default: "empty",
          options: [
            {
              value: "empty",
              label: "Greeter",
              description: "One actor and action on a TaskWish server",
            },
            {
              value: "todo",
              label: "Todo",
              description:
                "Todos and a Codex motivator connected by a custom event",
            },
          ],
        },
      },
      install: {
        description: "Install dependencies",
        example: true,
        elicit: { default: true },
      },
      git: {
        description: "Initialize a git repository",
        example: true,
        elicit: { default: true },
      },
      templateDirectory: {
        elicit: { hidden: true },
      },
      skillPath: {
        elicit: { hidden: true },
      },
    },
  });

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function defaultTemplateDirectory(): Promise<string> {
  const candidates = runtimeDirectories().flatMap((directory) => [
    join(directory, "templates"),
    join(directory, "..", "templates"),
  ]);

  for (const candidate of candidates) {
    try {
      const details = await stat(candidate);
      if (details.isDirectory()) return candidate;
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }
  }

  throw new Error(`Cannot locate @taskwish/create-project templates.`);
}

async function defaultSkillPath(): Promise<string> {
  const packageDirectories = runtimeDirectories().flatMap((directory) => [
    directory,
    dirname(directory),
  ]);
  const candidates = packageDirectories.flatMap((packageDirectory) => [
    join(packageDirectory, "..", "skill", "SKILL.md"),
    join(packageDirectory, "node_modules", "@taskwish", "skill", "SKILL.md"),
  ]);

  for (const candidate of candidates) {
    try {
      const details = await stat(candidate);
      if (details.isFile()) return candidate;
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }
  }

  throw new Error(`Cannot locate @taskwish/skill/SKILL.md.`);
}

function runtimeDirectories(): string[] {
  const entrypoints = [process.execPath, process.argv[1]].filter(
    (entrypoint): entrypoint is string => Boolean(entrypoint),
  );

  return [
    ...new Set(
      entrypoints.map((entrypoint) => dirname(resolveEntrypoint(entrypoint))),
    ),
  ];
}

function resolveEntrypoint(entrypoint: string): string {
  try {
    return realpathSync(entrypoint);
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
    return entrypoint;
  }
}

async function copyTemplateDirectory(
  source: string,
  destination: string,
  relativeDirectory = "",
): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(source);
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new Error(`Template directory not found: ${source}`);
    }
    throw error;
  }

  const copiedFiles: string[] = [];

  for (const entry of entries) {
    if (
      entry === "node_modules" ||
      entry === "bun.lock" ||
      (relativeDirectory === "" && entry === "state")
    ) {
      continue;
    }

    const input = join(source, entry);
    const outputName = entry === "gitignore" ? ".gitignore" : entry;
    const output = join(destination, outputName);
    const outputRelative = join(relativeDirectory, outputName);
    const details = await stat(input);

    if (details.isDirectory()) {
      await mkdir(output, { recursive: true });
      const nestedFiles = await copyTemplateDirectory(
        input,
        output,
        outputRelative,
      );
      copiedFiles.push(...nestedFiles);
    } else if (details.isFile()) {
      await mkdir(dirname(output), { recursive: true });
      copyFileSync(input, output);
      copiedFiles.push(outputRelative);
    }
  }

  return copiedFiles;
}

function resolveWorkspaceVersions(
  dependencies: Record<string, string>,
  versions: TemplateVersions,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(dependencies).map(([name, range]) => {
      if (range !== "workspace:*") return [name, range];

      const version = versions[name];
      if (!version) {
        throw new Error(`Template dependency version not found for ${name}.`);
      }
      return [name, `^${version}`];
    }),
  );
}

async function runCommand(command: string[], cwd: string): Promise<void> {
  const [executable, ...args] = command;
  if (!executable) throw new Error("Cannot run an empty command.");

  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(executable, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code: number | null) => {
      resolve(code ?? 1);
    });
  });

  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed with exit code ${exitCode}.`);
  }
}
