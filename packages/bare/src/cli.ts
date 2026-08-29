#!/usr/bin/env bun

import { mkdir, readdir, rm } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

import { morphDir } from "./dir";
import { morphEntrypoint } from "./entrypoint";

type CliOptions = {
  entrypoint: string;
  packageDir: string;
  sourceDir: string;
  outputDir: string;
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

  await copyEntrypoint(options, serviceDirs);
}

function parseArgs(args: string[]): CliOptions {
  let entrypoint = "cli";
  let packageDir = process.cwd();
  let sourceDir = "src";
  let outputDir = ".bare";

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "--out-dir") {
      outputDir = readValue(args, ++index, arg);
    } else if (arg === "--src-dir") {
      sourceDir = readValue(args, ++index, arg);
    } else if (arg === "--package-dir") {
      packageDir = readValue(args, ++index, arg);
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
    packageDir,
    sourceDir: resolve(packageDir, sourceDir),
    outputDir: resolve(packageDir, outputDir),
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

Build a self-contained bare source tree from a TaskWish package.

Arguments:
  entrypoint            Source entrypoint to copy into .bare (default: cli)

Options:
  --src-dir <dir>       Source directory with service folders (default: src)
  --out-dir <dir>       Generated bare output directory (default: .bare)
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

  source = morphEntrypoint(source);

  await Bun.write(output, source);
}

function rewriteEntrypointServiceImport(source: string, serviceDir: string): string {
  const escaped = escapeRegExp(serviceDir);

  return source.replace(
    new RegExp(`from\\s+["']\\./src/${escaped}(?:/index)?["']`, "g"),
    `from "./${serviceDir}"`,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
