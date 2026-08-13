import { indent } from "./syntax";
import type { ActionSpec, ServiceSpec } from "./types";

export function printAction(action: ActionSpec): string {
  if (action.steps.length === 0) {
    throw new Error(
      `${action.actorName}.${action.actionName} has no Step calls.`
    );
  }

  const actionEventName = `${action.actorName}::${action.actionName}`;
  const ctxName = `${action.actionName}Ctx`;
  const interfaceName = `${upperFirst(action.actionName)}Action`;
  const parameterText = action.inputType ? `input: ${action.inputType}` : "";
  const inputArgText = action.inputType ? "input" : "";
  const usesSignal = action.steps.some((step) => step.usesSignal);
  const usesAbortSignal = action.steps.some((step) => step.usesAbortSignal);
  const returnTypeText = action.steps.at(-1)!.propertyType;
  const initialScopeProperties = [
    `wire`,
    usesAbortSignal ? `abortSignal: undefined as AbortSignal | undefined` : null,
    action.actionDependencies.length > 0
      ? `actions: { ${action.actionDependencies
          .map((dependency) => printActionDependencyDefault(dependency))
          .join(", ")} }`
      : null,
  ].filter((property): property is string => property !== null);
  const initialScopeText = `{ ${initialScopeProperties.join(", ")} }`;
  const scopeReferenceName = "scope";
  const lines: string[] = [
    `interface ${interfaceName} {`,
    `  (${parameterText}): Promise<${returnTypeText}>;`,
    `  run(${parameterText}): Promise<${returnTypeText}>;`,
    `  stream(${parameterText}): Promise<${returnTypeText}>;`,
    `  ctx: typeof ${ctxName};`,
    `}`,
    ``,
    `export const ${action.actionName}: ${interfaceName} = Object.assign(`,
    `  async function ${action.actionName}(${parameterText}) {`,
    `    return ${ctxName}().run(${inputArgText});`,
    `  },`,
    `  {`,
    `    run: ${ctxName}().run,`,
    `    stream: ${ctxName}().stream,`,
    `    ctx: ${ctxName},`,
    `  },`,
    `);`,
    ``,
    `function ${ctxName}(ctx = {}) {`,
    `  const wire = new Wire({ threadId: "main", log: "console" });`,
    `  const initialScope = ${initialScopeText};`,
    `  const ${scopeReferenceName}: typeof initialScope = createScope(initialScope, ctx);`,
    ``,
    `  async function run(${parameterText}) {`,
    `    return stream(${inputArgText});`,
    `  }`,
    ``,
    `  async function stream(${parameterText}) {`,
    action.inputType ? null : `    const input = undefined;`,
    ...(usesAbortSignal
      ? [
          `    const abortSignal = ${scopeReferenceName}.abortSignal as AbortSignal | undefined;`,
        ]
      : []),
    ...(usesSignal
      ? [
          `    const signal = (name: string, input: unknown): Record<string, unknown> => ({ ">>": name, input });`,
        ]
      : []),
    ``,
    `    scope.wire.trace("${actionEventName}", { input });`,
    ``,
  ].filter((line): line is string => line !== null);

  for (const step of action.steps) {
    if (step.directExpressionText !== null) {
      lines.push(
        `    const ${step.name} = ${scopeText(step.directExpressionText, scopeReferenceName)};`
      );
    } else {
      lines.push(`    let ${step.name}: ${step.propertyType};`);
      lines.push(step.useBreakBlock ? `    ${step.name}Block: {` : "    {");
      lines.push(indent(scopeText(step.blockText, scopeReferenceName), 6));
      lines.push("    }");
    }
    lines.push("");
    lines.push(
      `    scope.wire.trace("${actionEventName}.${step.name}", { result: ${step.name} });`
    );
    lines.push("");
  }

  const lastStep = action.steps.at(-1)!;
  lines.push(
    `    scope.wire.trace("${actionEventName}", { result: ${lastStep.name} });`
  );
  lines.push("");
  lines.push(`    return ${lastStep.name};`);
  lines.push("  }");
  lines.push("");
  lines.push("  return { run, stream };");
  lines.push("}");

  return lines.join("\n");
}

function scopeText(value: string, scopeReferenceName: string): string {
  return scopeReferenceName === "scope"
    ? value
    : value.replace(/\bscope\./g, `${scopeReferenceName}.`);
}

function upperFirst(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function printActionDependencyDefault(
  dependency: import("./types").ActionDependency,
): string {
  return `${dependency.scopeName}: { ${dependency.actionNames
    .map((actionName) => `${actionName}: ${dependency.identifier}.${actionName}`)
    .join(", ")} }`;
}

export function printService(service: ServiceSpec): string {
  const lines = [`export const ${service.serviceName} = {`];

  for (const [index, actionName] of service.actionNames.entries()) {
    const separator = index === service.actionNames.length - 1 ? "" : ",";
    lines.push(`  ${actionName}${separator}`);
  }

  lines.push("};");

  return lines.join("\n");
}
