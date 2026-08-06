import type { ConsoleAction } from "../types";
import { actorColor } from "./actor-color";
import { uppercaseFirst } from "./console-text";

function splitActionName(
  id: string
): Pick<ConsoleAction, "actor" | "action" | "label"> {
  const [actor = "TaskWish", action = id] = id.split("::");
  const label = action
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return { actor, action, label: label || action };
}

function isVisibleAction(action: ConsoleAction): boolean {
  return !action.action.toLowerCase().startsWith("on");
}

function normalizeAction(raw: ConsoleAction): ConsoleAction {
  const parsed = splitActionName(raw.id);
  const label = uppercaseFirst(raw.label || parsed.label || parsed.action);
  return {
    ...parsed,
    ...raw,
    label,
    input: raw.input,
    color: raw.color || actorColor(raw.actor || parsed.actor),
  };
}

export function normalizeActions(actions: ConsoleAction[]): ConsoleAction[] {
  return actions.map(normalizeAction).filter(isVisibleAction);
}

export function getActionValue(action: ConsoleAction) {
  return action.id;
}

export function actionTitle(action: ConsoleAction) {
  return action.label || action.action;
}

export function actionDescription(action: ConsoleAction) {
  return action.description || action.actor;
}
