import { indent } from "./syntax";
import type { ActionSpec, ServiceSpec } from "./types";

export function printAction(action: ActionSpec): string {
  if (action.steps.length === 0) {
    throw new Error(
      `${action.actorName}.${action.actionName} has no Step calls.`
    );
  }

  const actionEventName = `${action.actorName}::${action.actionName}`;
  const runName = `${action.actionName}Run`;
  const streamName = `${action.actionName}Stream`;
  const parameterText = action.inputType ? `input: ${action.inputType}` : "";
  const streamParamText = action.inputType ? "{ input }" : "{}";
  const paramsType = action.inputType
    ? `{\n  input: ${action.inputType};\n}`
    : `{}`;
  const usesSignal = action.steps.some((step) => step.usesSignal);
  const lines: string[] = [
    `export async function ${action.actionName}(${parameterText}) {`,
    `  return consume(${streamName}(${streamParamText}));`,
    `}`,
    ``,
    `async function ${runName}(params: ${paramsType}) {`,
    `  return consume(${streamName}(params));`,
    `}`,
    ``,
    `async function* ${streamName}(params: ${paramsType}) {`,
    action.inputType
      ? `  const input = params.input;`
      : `  const input = undefined;`,
    ...(usesSignal
      ? [
          `  const signal = (name: string, input: unknown) => new Trace(name, { input });`,
        ]
      : []),
    ``,
    `  yield new Trace("${actionEventName}", { input });`,
    ``,
  ];

  for (const step of action.steps) {
    if (step.directExpressionText !== null) {
      lines.push(`  const ${step.name} = ${step.directExpressionText};`);
    } else {
      lines.push(`  let ${step.name}: ${step.propertyType};`);
      lines.push(step.useBreakBlock ? `  ${step.name}Block: {` : "  {");
      lines.push(indent(step.blockText, 4));
      lines.push("  }");
    }
    lines.push("");
    lines.push(
      `  yield new Trace("${actionEventName}.${step.name}", { result: ${step.name} });`
    );
    lines.push("");
  }

  const lastStep = action.steps.at(-1)!;
  lines.push(
    `  yield new Trace("${actionEventName}", { result: ${lastStep.name} });`
  );
  lines.push("");
  lines.push(`  return ${lastStep.name};`);
  lines.push("}");

  return lines.join("\n");
}

export function printService(service: ServiceSpec): string {
  const lines = [`export const ${service.serviceName} = {`];

  for (const actionName of service.actionNames) {
    lines.push(`  ${actionName},`);
  }

  lines.push("  run: {");
  for (const [index, actionName] of service.actionNames.entries()) {
    const separator = index === service.actionNames.length - 1 ? "" : ",";
    lines.push(`    ${actionName}: ${actionName}Run${separator}`);
  }
  lines.push("  },");

  lines.push("  stream: {");
  for (const [index, actionName] of service.actionNames.entries()) {
    const separator = index === service.actionNames.length - 1 ? "" : ",";
    lines.push(`    ${actionName}: ${actionName}Stream${separator}`);
  }
  lines.push("  }");

  lines.push("};");

  return lines.join("\n");
}
