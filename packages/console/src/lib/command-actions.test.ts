import { describe, expect, test } from "bun:test";

import type { ConsoleAction } from "../types";
import { isActionCardVisible, normalizeActions } from "./command-actions";

describe("command actions", () => {
  test("formats fallback action labels as sentence case", () => {
    const action = {
      id: "Todos::addTodo",
      actor: "",
      action: "",
      label: "",
      mode: "form",
      route: "/tw/Todos/add-todo",
      source: "local",
      input: [],
      meta: {},
    } satisfies ConsoleAction;

    expect(normalizeActions([action])[0]!.label).toBe("Add todo");
  });

  test("hides event listeners but keeps chat events", () => {
    const event = {
      id: "EventDrivenLoop::onGitHubIssueOpened",
      actor: "EventDrivenLoop",
      action: "onGitHubIssueOpened",
      label: "On GitHub issue opened",
      mode: "form",
      route: "/tw/EventDrivenLoop/on-git-hub-issue-opened",
      source: "event",
      input: [],
      meta: { event: "GitHub::IssueOpened" },
    } satisfies ConsoleAction;
    const chat = {
      ...event,
      id: "Assistant::chat",
      actor: "Assistant",
      action: "chat",
      label: "Chat",
      mode: "chat",
      meta: { event: "Message", command: "chat" },
    } satisfies ConsoleAction;

    const [normalizedEvent, normalizedChat] = normalizeActions([event, chat]);

    expect(isActionCardVisible(normalizedEvent!)).toBe(false);
    expect(isActionCardVisible(normalizedChat!)).toBe(true);
  });

  test("does not hide commands whose names start with on", () => {
    const command = {
      id: "Setup::onboardUser",
      actor: "Setup",
      action: "onboardUser",
      label: "Onboard user",
      mode: "form",
      route: "/tw/Setup/onboard-user",
      source: "local",
      input: [],
      meta: {},
    } satisfies ConsoleAction;

    expect(isActionCardVisible(normalizeActions([command])[0]!)).toBe(true);
  });
});
