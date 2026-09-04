import {
  chmod,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { join, relative, sep } from "node:path";

const packageDirectory = join(import.meta.dir, "..");
const templatesDirectory = join(packageDirectory, "templates");
const PROJECT_SKILL_PATH = ".agents/skills/taskwish/SKILL.md";
const bareAction = join(
  packageDirectory,
  ".bare",
  "scaffolder",
  "create-project.ts"
);
const standaloneEntry = join(
  packageDirectory,
  ".bare",
  "create-taskwish-project.ts"
);
const platformBuilds = [
  ["darwin-arm64", "bun-darwin-arm64"],
  ["darwin-x64", "bun-darwin-x64"],
  ["linux-arm64", "bun-linux-arm64"],
  ["linux-x64", "bun-linux-x64-baseline"],
  ["linux-arm64-musl", "bun-linux-arm64-musl"],
  ["linux-x64-musl", "bun-linux-x64-baseline-musl"],
  ["windows-arm64.exe", "bun-windows-arm64"],
  ["windows-x64.exe", "bun-windows-x64-baseline"],
] as const satisfies ReadonlyArray<readonly [string, Bun.Build.CompileTarget]>;

if (process.argv.includes("--platforms")) {
  await prepareStandaloneEntry();
  await buildPlatformExecutables();
} else {
  await buildNodeEntrypoint();
}

async function buildNodeEntrypoint(): Promise<void> {
  const executable = join(
    packageDirectory,
    "dist",
    "create-taskwish-project.mjs"
  );
  await mkdir(join(packageDirectory, "dist"), { recursive: true });

  const result = await Bun.build({
    entrypoints: [join(packageDirectory, "create-taskwish-project.ts")],
    target: "node",
    format: "esm",
    packages: "external",
    outdir: join(packageDirectory, "dist"),
    naming: "create-taskwish-project.mjs",
  });

  if (!result.success) {
    throw new AggregateError(
      result.logs,
      `Could not build the Node create-project CLI.`
    );
  }

  await chmod(executable, 0o755);
}

async function prepareStandaloneEntry(): Promise<void> {
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
    "const EMBEDDED_TEMPLATE_FILES: Readonly<Record<string, string>> = {};";
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
    "utf8"
  );
  const standaloneSource = source
    .replace(wireImport, staticWire)
    .replace(
      embeddedTemplatesDeclaration,
      () =>
        `const EMBEDDED_TEMPLATE_FILES: Readonly<Record<string, string>> = ${JSON.stringify(
          embeddedTemplateFiles
        )};`
    )
    .replace(
      embeddedSkillDeclaration,
      () => `const EMBEDDED_SKILL = ${JSON.stringify(embeddedSkill)};`
    );

  await writeFile(bareAction, standaloneSource);
}

async function buildPlatformExecutables(): Promise<void> {
  const outputDirectory = join(
    packageDirectory,
    "..",
    "..",
    "apps",
    "web",
    "public",
    "cli"
  );
  await mkdir(outputDirectory, { recursive: true });

  for (const [platform, target] of platformBuilds) {
    const executable = join(
      outputDirectory,
      `create-taskwish-project-${platform}`
    );
    console.log(`Building create-project for ${platform}...`);
    const result = await Bun.build({
      entrypoints: [standaloneEntry],
      compile: { target, outfile: executable },
    });

    if (!result.success) {
      throw new AggregateError(
        result.logs,
        `Could not build the create-project CLI for ${platform}.`
      );
    }

    const executableSize = (await stat(executable)).size;
    if (executableSize === 0) {
      throw new Error(`Built an empty create-project CLI for ${platform}.`);
    }
  }
}

async function readTemplateFiles(
  directory: string
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
        if (
          entry.name === "node_modules" ||
          entry.name === "dist" ||
          entry.name === "playwright-report" ||
          entry.name === "test-results"
        ) {
          continue;
        }
        if (entry.name === "state" && embeddedPath.split("/").length === 2) {
          continue;
        }
        await visit(path);
      } else if (
        entry.isFile() &&
        entry.name !== "bun.lock" &&
        entry.name !== ".DS_Store"
      ) {
        if (embeddedPath.endsWith(`/${PROJECT_SKILL_PATH}`)) continue;
        files[embeddedPath] = await readFile(path, "utf8");
      }
    }
  }
}
