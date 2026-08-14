import { mkdir, readdir, rm } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Node, Project, QuoteKind, ScriptTarget, SyntaxKind, ts } from "ts-morph";

import { applyBareMetalReplacements } from "./edits";
import { findActionSpecs } from "./parser";
import { isDefined, unwrapExpression } from "./syntax";
import type { MorphOptions } from "./types";

export type MorphDirOptions = MorphOptions & {
  baseDir?: string | URL;
  outputDir?: string | URL;
};

type SourceModule = {
  actionNames: string[];
  fileName: string;
  filePath: string;
  moduleName: string;
  source: string;
};

type ServiceIndex = {
  serviceName: string;
  actionNames: string[];
};

type SourceSplit = {
  directivePrologue: string;
  body: string;
};

export async function morphDir(
  directory: string | URL,
  options: MorphDirOptions = {}
): Promise<void> {
  const baseDir = defaultBaseDir(options.baseDir);
  const inputDirectory = resolvePath(directory, baseDir);
  const outputDirectory = options.outputDir
    ? resolvePath(options.outputDir, inputDirectory)
    : defaultOutputDirectory(inputDirectory);
  const project = projectForBaseDir(baseDir);
  const modules = await readSourceModules(inputDirectory);
  const actorModules = modules.filter((module) => hasActorBinding(module.source));
  const actionModules = modules.filter((module) => module.actionNames.length > 0);
  const indexSource = await Bun.file(join(inputDirectory, "index.ts")).text();
  const serviceIndexes = parseServiceIndexes(
    indexSource,
    join(inputDirectory, "index.ts"),
    project
  );

  if (actorModules.length === 0) {
    throw new Error(`No TaskWish actor found in ${inputDirectory}.`);
  }

  if (actionModules.length === 0) {
    throw new Error(`No TaskWish actor actions found in ${inputDirectory}.`);
  }

  await mkdir(outputDirectory, { recursive: true });

  await Promise.all(
    actorModules.map((actorModule) =>
      removeOutput(join(outputDirectory, actorModule.fileName))
    )
  );

  const localModules = actorModules.map((module) => module.moduleName);
  const actorSource = actorModules.map((module) => module.source).join("\n\n");
  const actorImports = new Set(importLines(actorSource));

  await Promise.all(
    actionModules.map((actionModule) => {
      const actionSource = splitDirectivePrologue(actionModule.source);
      const input = stripLocalImports(
        `${actorSource}\n\n${actionSource.body}`,
        localModules
      );
      const output = actionSource.directivePrologue + stripActorImports(
        exportRunHelpers(
          morphSource(input, {
            ...options,
            filePath: actionModule.filePath,
          }, project)
        ),
        actorImports
      );

      return writeOutput(join(outputDirectory, actionModule.fileName), output);
    })
  );

  await writeOutput(
    join(outputDirectory, "index.ts"),
    printServiceIndex(serviceIndexes, actionModules)
  );
}

async function readSourceModules(directory: string): Promise<SourceModule[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const modules = await Promise.all(
    entries.map(async (entry): Promise<SourceModule | null> => {
      if (!entry.isFile()) return null;
      if (entry.name === "index.ts") return null;
      if (extname(entry.name) !== ".ts") return null;
      if (entry.name.endsWith(".d.ts")) return null;

      const filePath = join(directory, entry.name);
      const source = await Bun.file(filePath).text();

      return {
        actionNames: actionSpecsForSource(source),
        fileName: entry.name,
        filePath,
        moduleName: `./${entry.name.replace(/\.ts$/, "")}`,
        source,
      };
    })
  );

  return modules
    .filter(isDefined)
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}

function hasActorBinding(source: string): boolean {
  return source.includes("Actor(");
}

function actionSpecsForSource(source: string): string[] {
  const sourceFile = createSourceFile("action.ts", source);
  const actions = [];

  for (const declaration of sourceFile.getVariableDeclarations()) {
    const nameNode = declaration.getNameNode();
    if (!Node.isObjectBindingPattern(nameNode)) continue;

    const statement = declaration.getFirstAncestorByKind(
      SyntaxKind.VariableStatement
    );
    if (!statement?.isExported()) continue;

    const initializer = declaration.getInitializer();
    if (!initializer) continue;

    const call = unwrapExpression(initializer);
    if (!Node.isCallExpression(call)) continue;
    if (!callChainHasMethod(call, "run")) continue;

    const actionName = nameNode.getElements()[0]?.getNameNode().getText();
    if (actionName) actions.push(actionName);
  }

  return actions;
}

function parseServiceIndexes(
  source: string,
  filePath: string,
  project?: Project
): ServiceIndex[] {
  const sourceFile = createSourceFile(filePath, source, project);
  const services: ServiceIndex[] = [];

  for (const declaration of sourceFile.getVariableDeclarations()) {
    const nameNode = declaration.getNameNode();
    if (!Node.isObjectBindingPattern(nameNode)) continue;

    const statement = declaration.getFirstAncestorByKind(
      SyntaxKind.VariableStatement
    );
    if (!statement?.isExported()) continue;

    const initializer = declaration.getInitializer();
    if (!initializer) continue;

    const serviceCall = unwrapExpression(initializer);
    if (!Node.isCallExpression(serviceCall)) continue;

    const expression = unwrapExpression(serviceCall.getExpression());
    if (!Node.isPropertyAccessExpression(expression)) continue;
    if (expression.getName() !== "service") continue;

    const serviceName = nameNode.getElements()[0]?.getNameNode().getText();
    if (!serviceName) continue;

    services.push({
      serviceName,
      actionNames: parseServiceActionNames(serviceCall),
    });
  }

  if (services.length === 0) {
    throw new Error(`No TaskWish service found in ${filePath}.`);
  }

  return services;
}

function parseServiceActionNames(
  serviceCall: import("ts-morph").CallExpression
): string[] {
  const config = serviceCall.getArguments()[0];
  if (!config || !Node.isObjectLiteralExpression(config)) return [];

  return config
    .getProperties()
    .flatMap((property) => {
      if (Node.isShorthandPropertyAssignment(property)) {
        return [property.getNameNode().getText()];
      }

      if (!Node.isPropertyAssignment(property)) return [];

      const initializer = unwrapExpression(property.getInitializerOrThrow());
      return Node.isIdentifier(initializer) ? [initializer.getText()] : [];
    });
}

function callChainHasMethod(node: Node, methodName: string): boolean {
  if (!Node.isCallExpression(node)) return false;

  const expression = unwrapExpression(node.getExpression());
  if (!Node.isPropertyAccessExpression(expression)) return false;
  if (expression.getName() === methodName) return true;

  const receiver = unwrapExpression(expression.getExpression());
  return (
    Node.isCallExpression(receiver) && callChainHasMethod(receiver, methodName)
  );
}

function splitDirectivePrologue(source: string): SourceSplit {
  const sourceFile = createSourceFile("source.ts", source);
  let end = 0;

  for (const statement of sourceFile.getStatements()) {
    if (!statement.getText().match(/^["']use\s+[^"']+["'];?$/)) break;

    end = statement.getEnd();
    while (end < source.length && /\s/.test(source[end] ?? "")) {
      end++;
    }
  }

  return {
    directivePrologue: source.slice(0, end),
    body: source.slice(end),
  };
}

function stripLocalImports(source: string, localModules: string[]): string {
  return source
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !localModules.some((module) =>
        trimmed.match(
          new RegExp(
            `^import\\s+.+\\s+from\\s+["']${escapeRegExp(module)}["'];?$`
          )
        )
      );
    })
    .join("\n")
    .trim();
}

function stripActorImports(source: string, actorImports: Set<string>): string {
  const lines = source.split("\n");

  return lines
    .filter((line, index) => {
      if (!actorImports.has(line.trim())) return true;

      return importLineUsed(line, [
        ...lines.slice(0, index),
        ...lines.slice(index + 1),
      ]);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function importLineUsed(line: string, otherLines: string[]): boolean {
  const localNames = importLocalNames(line);
  if (localNames.length === 0) return false;

  const source = otherLines.join("\n");
  return localNames.some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(source));
}

function importLocalNames(line: string): string[] {
  const names: string[] = [];
  const namedImports = line.match(/\{\s*([^}]+)\s*\}/)?.[1];

  if (namedImports) {
    for (const namedImport of namedImports.split(",")) {
      const parts = namedImport.trim().split(/\s+as\s+/);
      const name = parts.at(-1)?.trim();
      if (name) names.push(name);
    }
  }

  const defaultImport = line.match(/^import\s+([A-Za-z_$][\w$]*)\s*(?:,|\s+from)/)?.[1];
  if (defaultImport) names.push(defaultImport);

  return names;
}

function importLines(source: string): string[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.match(/^import\s+.+\s+from\s+["'].+["'];?$/));
}

function exportRunHelpers(source: string): string {
  return source
    .replace(
      /\nasync function ([A-Za-z_$][\w$]*Run)\(/g,
      "\nexport async function $1("
    )
    .replace(
      /\nasync function\* ([A-Za-z_$][\w$]*Stream)\(/g,
      "\nexport async function* $1("
    );
}

function printServiceIndex(
  services: ServiceIndex[],
  actionModules: SourceModule[]
): string {
  const actionFiles = new Map<string, string>();

  for (const actionModule of actionModules) {
    for (const actionName of actionModule.actionNames) {
      actionFiles.set(actionName, actionModule.moduleName);
    }
  }

  const lines: string[] = [];

  for (const service of services) {
    for (const actionName of service.actionNames) {
      const actionModule = actionFiles.get(actionName);
      if (!actionModule) {
        throw new Error(`No action file found for ${actionName}.`);
      }

      lines.push(`import { ${actionName} } from "${actionModule}";`);
    }

    lines.push("");
    lines.push(`export const ${service.serviceName} = {`);
    for (const [index, actionName] of service.actionNames.entries()) {
      const separator = index === service.actionNames.length - 1 ? "" : ",";
      lines.push(`  ${actionName}${separator}`);
    }
    lines.push("};");
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

function createProject(): Project {
  return new Project({
    compilerOptions: {
      allowJs: false,
      esModuleInterop: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      resolveJsonModule: true,
      skipLibCheck: true,
      strict: true,
      target: ScriptTarget.ESNext,
    },
    manipulationSettings: {
      quoteKind: QuoteKind.Double,
    },
  });
}

const projectCache = new Map<string, Project>();

function projectForBaseDir(baseDir: string): Project {
  let project = projectCache.get(baseDir);
  if (!project) {
    project = createProject();
    projectCache.set(baseDir, project);
  }

  return project;
}

function createSourceFile(filePath: string, source: string, project = createProject()) {
  return project.createSourceFile(filePath, source, { overwrite: true });
}

function morphSource(
  sourceText: string,
  options: MorphOptions = {},
  project?: Project
): string {
  const sourceFile = createSourceFile(
    options.filePath ?? "actor.ts",
    sourceText,
    project
  );
  const actions = findActionSpecs(sourceFile);

  if (actions.length === 0) {
    throw new Error("No TaskWish actor action chain found.");
  }

  return applyBareMetalReplacements(sourceText, sourceFile, actions).trim();
}

function defaultBaseDir(baseDir?: string | URL): string {
  if (baseDir) return resolvePath(baseDir, process.cwd());

  const entrypoint = process.argv[1];
  return entrypoint ? dirname(resolve(entrypoint)) : process.cwd();
}

function defaultOutputDirectory(inputDirectory: string): string {
  const sourceRoot = dirname(inputDirectory);
  const packageRoot =
    basename(sourceRoot) === "src" ? dirname(sourceRoot) : sourceRoot;

  return join(packageRoot, "bare", basename(inputDirectory));
}

function resolvePath(path: string | URL, baseDir: string): string {
  if (path instanceof URL) return fileURLToPath(path);
  return resolve(baseDir, path);
}

async function writeOutput(output: string, text: string): Promise<void> {
  await mkdir(dirname(output), { recursive: true });
  await Bun.write(output, text);
  console.log(`Wrote ${output}`);
}

async function removeOutput(output: string): Promise<void> {
  await rm(output, { force: true });
  console.log(`Removed ${output}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
