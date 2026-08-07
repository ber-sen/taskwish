import { indent } from "./syntax";
import type { ActionSpec, ServiceSpec } from "./types";

export function printAction(action: ActionSpec): string {
  if (action.steps.length === 0) {
    throw new Error(`${action.actorName}.${action.actionName} has no Step calls.`);
  }

  const parameterText = action.inputType ? `input: ${action.inputType}` : "";
  const lines: string[] = [
    `export async function ${action.actionName}(${parameterText}) {`,
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
  }

  const lastStep = action.steps.at(-1)!;
  lines.push(`  return ${lastStep.name};`);
  lines.push("}");

  return lines.join("\n");
}

export function printService(service: ServiceSpec): string {
  const lines = [`export const ${service.serviceName} = {`];

  for (const [index, actionName] of service.actionNames.entries()) {
    const separator = index === service.actionNames.length - 1 ? "" : ",";
    lines.push(`  ${actionName}${separator}`);
  }

  lines.push("}");

  return lines.join("\n");
}
