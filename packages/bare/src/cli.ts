#!/usr/bin/env bun

import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";

import { Project, QuoteKind, ScriptTarget, ts } from "ts-morph";

import { morphDir } from "./dir";

type CliOptions = {
  entrypoint: string;
  outputName: string;
  packageDir: string;
  sourceDir: string;
  outputDir: string;
  skipPerry: boolean;
};

const options = parseArgs(Bun.argv.slice(2));

buildBarePackage(options).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function buildBarePackage(options: CliOptions): Promise<void> {
  const serviceDirs = await findServiceDirs(options.sourceDir);

  if (serviceDirs.length === 0) {
    throw new Error(`No service directories found in ${options.sourceDir}.`);
  }

  await rm(options.outputDir, { recursive: true, force: true });
  await mkdir(options.outputDir, { recursive: true });

  await Promise.all(
    serviceDirs.map((serviceDir) =>
      morphDir(serviceDir, {
        baseDir: options.sourceDir,
        outputDir: join(options.outputDir, serviceDir),
      }),
    ),
  );

  await copyWireSource(options);
  await copyEntrypoint(options, serviceDirs);
  await rewriteWireImports(options.outputDir);

  if (!options.skipPerry) {
    await compileWithPerry(options);
  }
}

function parseArgs(args: string[]): CliOptions {
  let entrypoint = "cli";
  let outputName = "cli";
  let packageDir = process.cwd();
  let sourceDir = "src";
  let outputDir = ".bare";
  let skipPerry = false;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "--out-dir") {
      outputDir = readValue(args, ++index, arg);
    } else if (arg === "--src-dir") {
      sourceDir = readValue(args, ++index, arg);
    } else if (arg === "--package-dir") {
      packageDir = readValue(args, ++index, arg);
    } else if (arg === "-o" || arg === "--output") {
      outputName = readValue(args, ++index, arg);
    } else if (arg === "--no-perry") {
      skipPerry = true;
    } else if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      entrypoint = arg;
    }
  }

  packageDir = resolve(packageDir);

  return {
    entrypoint: normalizeEntrypoint(entrypoint),
    outputName,
    packageDir,
    sourceDir: resolve(packageDir, sourceDir),
    outputDir: resolve(packageDir, outputDir),
    skipPerry,
  };
}

function readValue(args: string[], index: number, option: string): string {
  const value = args[index];
  if (!value) throw new Error(`Missing value for ${option}.`);

  return value;
}

function normalizeEntrypoint(entrypoint: string): string {
  return extname(entrypoint) === "" ? `${entrypoint}.ts` : entrypoint;
}

function printHelp(): void {
  console.log(`Usage: bare [options] [entrypoint]

Build a self-contained Perry source tree from a TaskWish example package.

Arguments:
  entrypoint            Source entrypoint to copy into .bare (default: cli)

Options:
  --src-dir <dir>       Source directory with service folders (default: src)
  --out-dir <dir>       Generated bare output directory (default: .bare)
  -o, --output <name>   Perry executable path relative to package dir (default: cli)
  --no-perry            Generate .bare without compiling with Perry
  -h, --help            Show this help
`);
}

async function findServiceDirs(sourceDir: string): Promise<string[]> {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const serviceDirs = await Promise.all(
    entries.map(async (entry): Promise<string | null> => {
      if (!entry.isDirectory()) return null;

      const indexPath = join(sourceDir, entry.name, "index.ts");
      if (!(await Bun.file(indexPath).exists())) return null;

      return entry.name;
    }),
  );

  return serviceDirs
    .filter((entry): entry is string => entry !== null)
    .sort((a, b) => a.localeCompare(b));
}

async function copyWireSource(options: CliOptions): Promise<void> {
  const wireSource = resolve(options.packageDir, "..", "wire", "src");
  const wireOutput = join(options.outputDir, ".modules", "@taskwish", "wire");

  await cp(wireSource, wireOutput, {
    recursive: true,
    filter: (source) => basename(source) !== ".DS_Store",
  });
}

async function copyEntrypoint(
  options: CliOptions,
  serviceDirs: string[],
): Promise<void> {
  const input = resolve(options.packageDir, options.entrypoint);
  const output = join(options.outputDir, basename(options.entrypoint));
  let source = await Bun.file(input).text();

  for (const serviceDir of serviceDirs) {
    source = rewriteEntrypointServiceImport(source, serviceDir);
  }

  await Bun.write(output, source);
}

function rewriteEntrypointServiceImport(source: string, serviceDir: string): string {
  const escaped = escapeRegExp(serviceDir);

  return source.replace(
    new RegExp(`from\\s+["']\\./src/${escaped}(?:/index)?["']`, "g"),
    `from "./${serviceDir}"`,
  );
}

async function rewriteWireImports(outputDir: string): Promise<void> {
  const files = await findTypeScriptFiles(outputDir);
  const project = new Project({
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ScriptTarget.ESNext,
    },
    manipulationSettings: {
      quoteKind: QuoteKind.Double,
    },
  });

  await Promise.all(
    files.map(async (filePath) => {
      const source = await Bun.file(filePath).text();
      const sourceFile = project.createSourceFile(filePath, source, {
        overwrite: true,
      });
      let changed = false;

      for (const importDeclaration of sourceFile.getImportDeclarations()) {
        if (importDeclaration.getModuleSpecifierValue() !== "@taskwish/wire") {
          continue;
        }

        importDeclaration.setModuleSpecifier(
          relativeImport(filePath, join(outputDir, ".modules", "@taskwish", "wire", "index.ts")),
        );
        changed = true;
      }

      if (changed) {
        await Bun.write(filePath, sourceFile.getFullText());
      }
    }),
  );
}

async function findTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return findTypeScriptFiles(path);
      }

      if (!entry.isFile()) return [];
      if (!entry.name.endsWith(".ts")) return [];
      if (entry.name.endsWith(".d.ts")) return [];

      return [path];
    }),
  );

  return files.flat();
}

function relativeImport(fromFile: string, toDirectory: string): string {
  let specifier = relative(dirname(fromFile), toDirectory).split(sep).join("/");

  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    specifier = `./${specifier}`;
  }

  return specifier;
}

async function compileWithPerry(options: CliOptions): Promise<void> {
  const entrypoint = join(options.outputDir, basename(options.entrypoint));
  const output = resolve(options.packageDir, options.outputName);
  const process = Bun.spawn(
    ["perry", "compile", entrypoint, "-o", output],
    {
      cwd: options.packageDir,
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  const exitCode = await process.exited;

  if (exitCode !== 0) {
    throw new Error(`perry compile failed with exit code ${exitCode}.`);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
