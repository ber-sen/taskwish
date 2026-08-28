import { evaluateCEL } from "@taskwish/expr";

import type { ConsoleAction, ConsoleInputField } from "../types";
import type { ActionRunResult } from "./command-form";

export type ActionSuggestion = {
  action: ConsoleAction;
  payload: Record<string, unknown>;
  selector: unknown;
};

export type ActionSuggestionOption = {
  label: string;
  value: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalActionName(value: string): string {
  return value.replace("::", ".").replace(/[_-]/g, "").toLowerCase();
}

export function actionSuggestion(
  field: ConsoleInputField,
  actions: ConsoleAction[],
): ActionSuggestion | null {
  const suggestions = field.metadata?.suggestions;
  if (!isRecord(suggestions) || typeof suggestions.$ !== "string") return null;

  const reference = canonicalActionName(suggestions.$);
  const action = actions.find(
    (candidate) => canonicalActionName(candidate.id) === reference,
  );
  if (!action) return null;

  const { $, "*": selector, ...payload } = suggestions;
  return { action, payload, selector };
}

function option(label: unknown, value: unknown): ActionSuggestionOption | null {
  if (value === undefined || value === null) return null;
  return {
    label: String(label ?? value),
    value: String(value),
  };
}

function optionsFromValues(values: unknown): ActionSuggestionOption[] {
  if (!Array.isArray(values)) return [];

  return values.flatMap((value) => {
    if (Array.isArray(value) && value.length >= 2) {
      const result = option(value[0], value[1]);
      return result ? [result] : [];
    }
    if (isRecord(value)) {
      const result = option(
        value.name ?? value.label ?? value.description ?? value.id,
        value.id ?? value.value,
      );
      return result ? [result] : [];
    }
    const result = option(value, value);
    return result ? [result] : [];
  });
}

export function actionSuggestionOptions(
  result: unknown,
  selector: unknown,
): ActionSuggestionOption[] {
  if (typeof selector !== "string") return [];
  try {
    return optionsFromValues(evaluateCEL(selector, result));
  } catch {
    return [];
  }
}

export function actionResultValue(result: ActionRunResult): unknown {
  const resultEvent = result.events
    ?.slice()
    .reverse()
    .find((event) => event.type === "result" || event.type === "state");
  if (resultEvent?.type === "state" && isRecord(resultEvent.data)) {
    return resultEvent.data.value;
  }
  return resultEvent ? resultEvent.data : result.body;
}
