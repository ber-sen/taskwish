import type { CommandCenterAction } from "../types";
import { actorColor } from "./actor-color";
import { uppercaseFirst } from "./command-center-text";

function splitActionName(
  id: string,
): Pick<CommandCenterAction, "actor" | "action" | "label"> {
  const [actor = "TaskWish", action = id] = id.split("::");
  const label = action
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return { actor, action, label: label || action };
}

function isVisibleAction(action: CommandCenterAction): boolean {
  return !action.action.toLowerCase().startsWith("on");
}

function normalizeAction(raw: CommandCenterAction): CommandCenterAction {
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

export function normalizeActions(
  actions: CommandCenterAction[],
): CommandCenterAction[] {
  return actions.map(normalizeAction).filter(isVisibleAction);
}

export function getActionValue(action: CommandCenterAction) {
  return action.id;
}

export function actionTitle(action: CommandCenterAction) {
  return action.label || action.action;
}

export function actionDescription(action: CommandCenterAction) {
  return action.description || action.actor;
}
