import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

const packageDirectory = join(import.meta.dir, "..");
const templatesDirectory = join(packageDirectory, "templates");
const PROJECT_SKILL_PATH = ".agents/skills/taskwish/SKILL.md";
const bareAction = join(
  packageDirectory,
  ".bare",
  "scaffolder",
  "create-project.ts",
);

await Bun.$`bare create-taskwish-project`;

const source = await readFile(bareAction, "utf8");
const wireImport = /import\s*\{[^}]*\}\s*from\s*["']@taskwish\/wire["'];/;

if (!wireImport.test(source)) {
  throw new Error(`Bare output did not contain the expected Wire import.`);
}

const staticWire = `class Wire {
  trace(_path: string, _data: unknown): void {}
}`;

const embeddedTemplatesDeclaration =
  'const EMBEDDED_TEMPLATE_FILES: Readonly<Record<string, string>> = {};';
const embeddedSkillDeclaration = 'const EMBEDDED_SKILL = "";';

if (!source.includes(embeddedTemplatesDeclaration)) {
  throw new Error(`Bare output did not contain the templates placeholder.`);
}
if (!source.includes(embeddedSkillDeclaration)) {
  throw new Error(`Bare output did not contain the skill placeholder.`);
}

const embeddedTemplateFiles = await readTemplateFiles(templatesDirectory);
const embeddedSkill = await readFile(
  join(packageDirectory, "..", "skill", "SKILL.md"),
  "utf8",
);

const standaloneSource = source
  .replace(wireImport, staticWire)
  .replace(
    embeddedTemplatesDeclaration,
    `const EMBEDDED_TEMPLATE_FILES: Readonly<Record<string, string>> = ${JSON.stringify(embeddedTemplateFiles)};`,
  )
  .replace(
    embeddedSkillDeclaration,
    `const EMBEDDED_SKILL = ${JSON.stringify(embeddedSkill)};`,
  );

await writeFile(bareAction, standaloneSource);

const executable = join(
  packageDirectory,
  "dist",
  "create-taskwish-project",
);

await Bun.$`scriptc build ${join(
  packageDirectory,
  ".bare",
  "create-taskwish-project.ts",
)} -o ${executable} --npm-static @taskwish/terminal --no-keep-c`;

await verifyRelocatedExecutable(executable);

async function readTemplateFiles(
  directory: string,
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  await visit(directory);
  return files;

  async function visit(currentDirectory: string): Promise<void> {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const path = join(currentDirectory, entry.name);
      const embeddedPath = relative(directory, path).split(sep).join("/");
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        if (
          entry.name === "state" &&
          embeddedPath.split("/").length === 2
        ) {
          continue;
        }
        await visit(path);
      } else if (entry.isFile() && entry.name !== "bun.lock") {
        if (embeddedPath.endsWith(`/${PROJECT_SKILL_PATH}`)) continue;
        files[embeddedPath] = await readFile(path, "utf8");
      }
    }
  }
}

async function verifyRelocatedExecutable(executable: string): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "taskwish-create-project-"));
  const executableDirectory = join(directory, "bin");
  const relocatedExecutable = join(
    executableDirectory,
    "create-taskwish-project",
  );

  try {
    await mkdir(executableDirectory);
    await copyFile(executable, relocatedExecutable);
    await chmod(relocatedExecutable, (await stat(executable)).mode);

    for (const template of ["empty", "todo"]) {
      const projectName = `generated-${template}-project`;
      const project = join(directory, projectName);
      await Bun.$`${relocatedExecutable} ${project} --template ${template} --no-install --no-git --yes`.quiet();
      const packageJson = JSON.parse(
        await readFile(join(project, "package.json"), "utf8"),
      ) as { name?: string };
      if (packageJson.name !== projectName) {
        throw new Error(
          `Relocated CLI generated an invalid ${template} package.json.`,
        );
      }
      if (!(await readFile(join(project, PROJECT_SKILL_PATH), "utf8"))) {
        throw new Error(`Relocated CLI did not write the TaskWish skill.`);
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
