import { spawn } from "node:child_process";
import { copyFileSync, realpathSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

import { Step } from "taskwish";

import { actor } from "./actor";

export const TEMPLATE_NAMES = ["empty", "todo"] as const;

export type TemplateName = (typeof TEMPLATE_NAMES)[number];

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

type ResolvedCreateProjectOptions = {
  projectName: string;
  template: TemplateName;
  install: boolean;
  git: boolean;
  templateDirectory: string;
  skillPath: string;
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
    Step("scaffold", async function (): Promise<CreateProjectResult> {
      return scaffoldProject({
        projectName: this.input.projectName,
        template: parseTemplate(this.input.template),
        install: this.input.install ?? true,
        git: this.input.git ?? true,
        templateDirectory:
          this.input.templateDirectory ?? (await defaultTemplateDirectory()),
        skillPath: this.input.skillPath ?? (await defaultSkillPath()),
      });
    }),
  );

async function scaffoldProject(
  options: ResolvedCreateProjectOptions,
): Promise<CreateProjectResult> {
  const directory = resolve(options.projectName);
  const projectName = packageNameFromDirectory(directory);
  const templateDirectory = join(options.templateDirectory, options.template);

  await assertEmptyDirectory(directory);
  await mkdir(directory, { recursive: true });
  const files = await copyTemplateDirectory(templateDirectory, directory);
  copyFileSync(options.skillPath, join(directory, "SKILL.md"));
  if (!files.includes("SKILL.md")) files.push("SKILL.md");
  await setProjectPackageJson(
    directory,
    projectName,
    await readTemplateVersions(options.templateDirectory),
  );

  if (options.install) await runCommand(["bun", "install"], directory);
  if (options.git) await runCommand(["git", "init"], directory);

  return {
    directory,
    relativeDirectory: relative(process.cwd(), directory) || ".",
    projectName,
    template: options.template,
    installed: options.install,
    gitInitialized: options.git,
    files,
  };
}

function parseTemplate(template: string | undefined): TemplateName {
  const selected = template ?? "empty";
  if (selected === "empty" || selected === "todo") {
    return selected;
  }

  throw new Error(
    `Unknown template "${selected}". Choose empty, todo.`,
  );
}

async function assertEmptyDirectory(directory: string): Promise<void> {
  try {
    const details = await stat(directory);
    if (!details.isDirectory()) {
      throw new Error(
        `Cannot create a project at ${directory}: it is not a directory.`,
      );
    }

    const entries = await readdir(directory);
    if (entries.length > 0) {
      throw new Error(
        `Cannot create a project at ${directory}: the directory is not empty.`,
      );
    }
  } catch (error) {
    if (isMissingFileError(error)) return;
    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function packageNameFromDirectory(directory: string): string {
  const name = basename(directory)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");

  if (!name) {
    throw new Error(`Cannot derive a package name from ${directory}.`);
  }

  return name;
}

async function defaultTemplateDirectory(): Promise<string> {
  const entrypoint = process.argv[1];
  if (!entrypoint) return resolve("templates");

  let resolvedEntrypoint = entrypoint;
  try {
    resolvedEntrypoint = realpathSync(entrypoint);
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }

  return join(dirname(resolvedEntrypoint), "templates");
}

async function defaultSkillPath(): Promise<string> {
  const entrypoint = process.argv[1];
  if (!entrypoint) {
    throw new Error(`Cannot locate @taskwish/skill without an entrypoint.`);
  }

  let resolvedEntrypoint = entrypoint;
  try {
    resolvedEntrypoint = realpathSync(entrypoint);
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }

  const packageDirectory = dirname(resolvedEntrypoint);
  const candidates = [
    join(packageDirectory, "..", "skill", "SKILL.md"),
    join(packageDirectory, "node_modules", "@taskwish", "skill", "SKILL.md"),
  ];

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

async function readTemplateVersions(
  templateDirectory: string,
): Promise<TemplateVersions> {
  const versionsPath = join(templateDirectory, "versions.json");
  try {
    return JSON.parse(await readFile(versionsPath, "utf8")) as TemplateVersions;
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new Error(
        `Template dependency versions not found: ${versionsPath}`,
      );
    }
    throw error;
  }
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

async function setProjectPackageJson(
  directory: string,
  projectName: string,
  versions: TemplateVersions,
): Promise<void> {
  const packageJsonPath = join(directory, "package.json");
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
        name: projectName,
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
}

async function runCommand(command: string[], cwd: string): Promise<void> {
  const [executable, ...args] = command;
  if (!executable) throw new Error("Cannot run an empty command.");

  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(executable, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed with exit code ${exitCode}.`);
  }
}
