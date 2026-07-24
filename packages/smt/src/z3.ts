import { $ } from "bun";

import { modelExclusion, parseModel } from "./model";
import type { SmtDeclaration, SolveResult } from "./types";

export async function solveScript<T>(
  smtScript: string,
  declarations: readonly SmtDeclaration[],
): Promise<SolveResult<T>> {
  const output = await runZ3(smtScript);
  const status = output.trimStart().split(/\s+/, 1)[0];

  if (status === "sat") {
    const model = parseModel(output, declarations) as T;
    return {
      status,
      model,
    };
  }

  if (status === "unsat") {
    return {
      status,
      model: undefined,
    };
  }

  return {
    status: "unknown",
    model: undefined,
    reason: output.trim(),
  };
}

export async function expectSatScript<T>(
  smtScript: string,
  declarations: readonly SmtDeclaration[],
): Promise<T> {
  const result = await solveScript<T>(smtScript, declarations);

  if (result.status === "sat") return result.model;
  if (result.status === "unknown") {
    throw new Error(`Expected sat, got unknown: ${result.reason}`);
  }

  throw new Error("Expected sat, got unsat");
}

export async function* solveAllScripts<T>(
  smtScript: string,
  declarations: readonly SmtDeclaration[],
): AsyncGenerator<SolveResult<T>, void, unknown> {
  let nextScript = smtScript;

  while (true) {
    const result = await solveScript<T>(nextScript, declarations);
    if (result.status !== "sat") return;

    yield result;

    const exclusion = modelExclusion(
      result.model as Record<string, unknown>,
      declarations,
    );
    if (!exclusion) return;

    nextScript = insertAssertion(nextScript, exclusion);
  }
}

async function runZ3(smtScript: string): Promise<string> {
  try {
    return await $`echo ${smtScript} | z3 -in`.text();
  } catch (error) {
    const stdout = (error as { stdout?: unknown }).stdout;
    const output =
      typeof stdout === "string"
        ? stdout
        : stdout instanceof Uint8Array
          ? new TextDecoder().decode(stdout)
          : "";

    if (output.trim().length > 0) {
      return output;
    }
    throw error;
  }
}

function insertAssertion(smtScript: string, assertion: string): string {
  return smtScript.replace(
    "\n(check-sat)\n(get-model)\n",
    `\n(assert ${assertion})\n(check-sat)\n(get-model)\n`,
  );
}
