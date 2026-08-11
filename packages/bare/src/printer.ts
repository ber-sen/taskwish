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
  const parameterText = action.inputType ? `input: ${action.inputType}` : "";
  const inputArgText = action.inputType ? "input" : "";
  const usesSignal = action.steps.some((step) => step.usesSignal);
  const usesAbortSignal = action.steps.some((step) => step.usesAbortSignal);
  const lines: string[] = [
    `export const ${action.actionName} = Object.assign(`,
    `  async function ${action.actionName}(${parameterText}) {`,
    `    return ${ctxName}().run(${inputArgText});`,
    `  },`,
    `  {`,
    `    ...${ctxName}(),`,
    `    ctx: ${ctxName},`,
    `  },`,
    `);`,
    ``,
    `export function ${ctxName}(scope: Ctx = Ctx.new()) {`,
    `  scope = Ctx.new(scope);`,
    ``,
    `  async function run(${parameterText}) {`,
    `    return consume(stream(${inputArgText}));`,
    `  }`,
    ``,
    `  async function* stream(${parameterText}) {`,
    action.inputType ? null : `    const input = undefined;`,
    ...(usesAbortSignal ? [`    const abortSignal = scope.abortSignal;`] : []),
    ...(usesSignal
      ? [
          `    const signal = (name: string, input: unknown) => new Trace(name, { input });`,
        ]
      : []),
    ``,
    `    yield new Trace("${actionEventName}", { input });`,
    ``,
  ].filter((line): line is string => line !== null);

  for (const step of action.steps) {
    if (step.directExpressionText !== null) {
      lines.push(`    const ${step.name} = ${step.directExpressionText};`);
    } else {
      lines.push(`    let ${step.name}: ${step.propertyType};`);
      lines.push(step.useBreakBlock ? `    ${step.name}Block: {` : "    {");
      lines.push(indent(step.blockText, 6));
      lines.push("    }");
    }
    lines.push("");
    lines.push(
      `    yield new Trace("${actionEventName}.${step.name}", { result: ${step.name} });`
    );
    lines.push("");
  }

  const lastStep = action.steps.at(-1)!;
  lines.push(
    `    yield new Trace("${actionEventName}", { result: ${lastStep.name} });`
  );
  lines.push("");
  lines.push(`    return ${lastStep.name};`);
  lines.push("  }");
  lines.push("");
  lines.push("  return { run, stream };");
  lines.push("}");

  return lines.join("\n");
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
