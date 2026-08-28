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

function valueAtPath(value: unknown, path: string): unknown {
  if (!path) return value;
  return path.split(".").reduce<unknown>((current, key) => {
    return isRecord(current) ? current[key] : undefined;
  }, value);
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
  if (typeof selector === "string") {
    return optionsFromValues(valueAtPath(result, selector));
  }

  if (
    !Array.isArray(selector) ||
    typeof selector[0] !== "string" ||
    !selector[0].endsWith(".map") ||
    !Array.isArray(selector[1]) ||
    typeof selector[1][0] !== "string" ||
    !Array.isArray(selector[2]) ||
    typeof selector[2][0] !== "string" ||
    typeof selector[2][1] !== "string"
  ) {
    return [];
  }

  const path = selector[0].slice(0, -".map".length);
  const alias = `${selector[1][0]}.`;
  const labelPath = selector[2][0].replace(alias, "");
  const valuePath = selector[2][1].replace(alias, "");
  const values = valueAtPath(result, path);
  if (!Array.isArray(values)) return [];

  return values.flatMap((value) => {
    const result = option(
      valueAtPath(value, labelPath),
      valueAtPath(value, valuePath),
    );
    return result ? [result] : [];
  });
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
