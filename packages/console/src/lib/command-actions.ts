import type { ConsoleAction } from "../types";
import { sentenceFromIdentifier, uppercaseFirst } from "./console-text";

function splitActionName(
  id: string,
): Pick<ConsoleAction, "actor" | "action" | "label"> {
  const [actor = "TaskWish", action = id] = id.split("::");
  const label = sentenceFromIdentifier(action);

  return { actor, action, label: label || action };
}

export function isActionCardVisible(action: ConsoleAction): boolean {
  if (isChatAction(action)) return true;
  return action.source !== "event";
}

function normalizeAction(raw: ConsoleAction): ConsoleAction {
  const parsed = splitActionName(raw.id);
  const chat = isChatAction(raw);
  const label = uppercaseFirst(
    chat ? "Chat" : raw.label || parsed.label || parsed.action,
  );
  return {
    ...parsed,
    ...raw,
    ...(chat ? { action: "chat", label, mode: "chat" as const } : { label }),
    input: raw.input,
  };
}

export function normalizeActions(actions: ConsoleAction[]): ConsoleAction[] {
  return actions.map(normalizeAction);
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

export function isChatAction(action: ConsoleAction): boolean {
  if (action.mode === "chat") return true;
  if (
    action.meta !== null &&
    typeof action.meta === "object" &&
    !Array.isArray(action.meta)
  ) {
    return (action.meta as Record<string, unknown>).event === "Message";
  }
  return false;
}
