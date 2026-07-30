import { Project, QuoteKind, ScriptTarget, ts } from "ts-morph";

import { applyBareMetalReplacements } from "./edits";
import { findActionSpecs } from "./parser";
import type { MorphOptions } from "./types";

export type { MorphOptions } from "./types";

export function morph(sourceText: string, options: MorphOptions = {}): string {
  const project = new Project({
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

  const sourceFile = project.createSourceFile(
    options.filePath ?? "actor.ts",
    sourceText,
    { overwrite: true },
  );
  const actions = findActionSpecs(sourceFile);

  if (actions.length === 0) {
    throw new Error("No TaskWish actor action chain found.");
  }

  return applyBareMetalReplacements(sourceText, sourceFile, actions).trim();
}

export const transform = morph;
