"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";

import { ActionCommandItem } from "./components/console/action-command-item";
import { ActionDrawerHeader } from "./components/console/action-drawer-header";
import { ActorStateSummary } from "./components/console/actor-state-summary";
import {
  ActionForm,
  type ActionFormHandle,
} from "./components/console/action-form";
import { McpServerControl } from "./components/console/mcp-server-control";
import { HttpActionInstructions } from "./components/console/http-action-instructions";
import { TaskWishLogo } from "./components/console/taskwish-logo";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
} from "./components/ui/drawer";
import { Button } from "./components/ui/button";
import {
  isActionCardVisible,
  isChatAction,
  normalizeActions,
} from "./lib/command-actions";
import type { ActionRunEvent } from "./lib/command-form";
import type { ConsoleAction, ConsoleConfig } from "./types";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; config: ConsoleConfig }
  | { status: "error"; message: string };

export type ConsoleViewProps = {
  config?: ConsoleConfig;
  autoFocus?: boolean;
  showMcpServer?: boolean;
};

async function loadConfig(): Promise<ConsoleConfig> {
  const response = await fetch("/tw/console/config");
  if (!response.ok) {
    throw new Error(`Unable to load console (${response.status})`);
  }
  const config = (await response.json()) as ConsoleConfig;
  return {
    ...config,
    actions: normalizeActions(config.actions),
  };
}

export function Console({
  config: providedConfig,
  autoFocus = true,
  showMcpServer = true,
}: ConsoleViewProps = {}) {
  const [loadState, setLoadState] = useState<LoadState>(() =>
    providedConfig
      ? {
          status: "ready",
          config: {
            ...providedConfig,
            actions: normalizeActions(providedConfig.actions),
          },
        }
      : { status: "loading" },
  );
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState<ConsoleAction | null>(
    null
  );
  const [isActionChatMode, setIsActionChatMode] = useState(false);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [isActionHeaderCollapsed, setIsActionHeaderCollapsed] = useState(false);
  const [actionRunResetToken, setActionRunResetToken] = useState(0);
  const [selectedValue, setSelectedValue] = useState("");
  const [stateRefreshToken, setStateRefreshToken] = useState(0);
  const commandRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const actionFormRef = useRef<ActionFormHandle>(null);

  useEffect(() => {
    if (providedConfig) {
      const config = {
        ...providedConfig,
        actions: normalizeActions(providedConfig.actions),
      };
      setLoadState({ status: "ready", config });
      setSelectedValue(config.actions.find(isActionCardVisible)?.id ?? "");
      return;
    }

    let cancelled = false;
    void loadConfig()
      .then((config) => {
        if (!cancelled) {
          setLoadState({ status: "ready", config });
          setSelectedValue(
            config.actions.find(isActionCardVisible)?.id ?? ""
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [providedConfig]);

  useEffect(() => {
    setIsActionHeaderCollapsed(false);
    setIsActionChatMode(false);
    setIsActionRunning(false);
    setActionRunResetToken(0);
  }, [selectedAction]);

  const actions = useMemo(
    () => (loadState.status === "ready" ? loadState.config.actions : []),
    [loadState]
  );
  const actionCards = useMemo(
    () => actions.filter(isActionCardVisible),
    [actions]
  );

  const getVisibleActionValues = () =>
    Array.from(
      commandRef.current?.querySelectorAll<HTMLElement>(
        '[cmdk-item=""]:not([aria-disabled="true"])'
      ) ?? []
    )
      .map((item) => item.dataset.value)
      .filter((value): value is string => Boolean(value));

  const getColumnCount = () =>
    window.matchMedia("(min-width: 640px)").matches ? 3 : 2;

  const handleActionGridKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>
  ) => {
    const visibleValues = getVisibleActionValues();

    if (!visibleValues.length) {
      return;
    }

    const currentIndex = visibleValues.indexOf(selectedValue);
    const normalizedIndex = currentIndex === -1 ? 0 : currentIndex;
    const columnCount = getColumnCount();
    let nextIndex = normalizedIndex;

    switch (event.key) {
      case "ArrowDown": {
        const candidateIndex = normalizedIndex + columnCount;
        if (candidateIndex < visibleValues.length) {
          nextIndex = candidateIndex;
        }
        break;
      }
      case "ArrowUp": {
        const candidateIndex = normalizedIndex - columnCount;
        if (candidateIndex >= 0) {
          nextIndex = candidateIndex;
        }
        break;
      }
      case "ArrowRight":
        nextIndex = Math.min(normalizedIndex + 1, visibleValues.length - 1);
        break;
      case "ArrowLeft":
        nextIndex = Math.max(normalizedIndex - 1, 0);
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextValue = visibleValues[nextIndex];
    if (nextValue) {
      setSelectedValue(nextValue);
    }
  };

  const submitSelectedAction = () => {
    const form = document.getElementById(
      "console-action-form"
    ) as HTMLFormElement | null;
    form?.requestSubmit();
  };

  const startNewRun = () => {
    setIsActionChatMode(false);
    setIsActionRunning(false);
    setIsActionHeaderCollapsed(false);
    setActionRunResetToken((token) => token + 1);
  };

  const cancelSelectedAction = () => {
    actionFormRef.current?.cancel();
  };

  const handleStateChange = useCallback(
    (_actor: string, _event: ActionRunEvent) => {
      setStateRefreshToken((token) => token + 1);
    },
    []
  );

  const handleActionChatModeChange = useCallback((enabled: boolean) => {
    setIsActionChatMode(enabled);
    if (enabled) setIsActionHeaderCollapsed(false);
  }, []);

  const selectedActionIsChat = selectedAction
    ? isChatAction(selectedAction)
    : false;
  const selectedActionIsHttp = selectedAction?.source === "http";
  const isActionFinalized =
    isActionChatMode && !selectedActionIsChat && !isActionRunning;

  if (loadState.status === "loading") {
    return (
      <main className="mx-auto grid min-h-screen place-items-center bg-background p-4 text-sm text-muted-foreground">
        Loading Console
      </main>
    );
  }

  if (loadState.status === "error") {
    return (
      <main
        className="mx-auto grid min-h-screen place-items-center bg-background p-4 text-sm text-muted-foreground"
        role="alert"
      >
        {loadState.message}
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-background px-4 pb-16 pt-14 text-foreground">
      <a
        href="/"
        aria-label="TaskWish"
        className="absolute left-4 top-4 z-40 flex items-center"
      >
        <TaskWishLogo />
      </a>
      <CommandPrimitive
        ref={commandRef}
        label="Console"
        value={selectedValue}
        onValueChange={setSelectedValue}
        onKeyDown={handleActionGridKeyDown}
        disablePointerSelection
        className="mx-auto flex w-full max-w-4xl flex-col bg-transparent text-foreground"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold leading-tight text-foreground">
              Command Center
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Run actor commands, manage apps, and discover new capabilities.
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <CommandPrimitive.Input
              ref={searchInputRef}
              value={search}
              onValueChange={setSearch}
              placeholder="Search actions..."
              autoFocus={autoFocus}
              className="flex h-11 w-full rounded-lg border border-input bg-background py-1 pl-9 pr-2 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
        <div className="mx-auto mt-6 w-full max-w-2xl pb-8">
          <CommandPrimitive.List className="[&_[cmdk-list-sizer]]:grid [&_[cmdk-list-sizer]]:grid-cols-2 [&_[cmdk-list-sizer]]:gap-3 sm:[&_[cmdk-list-sizer]]:grid-cols-3">
            <CommandPrimitive.Empty className="col-span-full py-16 text-center text-sm text-muted-foreground">
              No actions found for &ldquo;{search}&rdquo;
            </CommandPrimitive.Empty>
            {actionCards.map((action) => (
              <ActionCommandItem
                key={action.id}
                action={action}
                onSelect={(selected) => setSelectedAction(selected)}
              />
            ))}
          </CommandPrimitive.List>
        </div>
      </CommandPrimitive>

      {showMcpServer ? <McpServerControl config={loadState.config} /> : null}

      <Drawer
        open={Boolean(selectedAction)}
        swipeDirection="right"
        disableGestures
        onOpenChange={(open) => {
          if (!open) {
            cancelSelectedAction();
            setSelectedAction(null);
          }
        }}
      >
        <DrawerContent
          className="mini-app:border-0 rounded-none [--drawer-inset:0px] [--drawer-max-width:100vw] [--drawer-width:100vw] sm:rounded-2xl sm:[--drawer-inset:12px] sm:[--drawer-max-width:520px] sm:[--drawer-width:calc(100vw-24px)] lg:[--drawer-max-width:600px]"
          finalFocus={searchInputRef}
        >
          {selectedAction ? (
            <>
              <ActionDrawerHeader
                action={selectedAction}
                collapsed={isActionHeaderCollapsed}
                showLogs={showLogs}
                canRun={
                  !selectedActionIsHttp &&
                  !isActionChatMode &&
                  !selectedActionIsChat
                }
                isRunning={isActionRunning}
                isFinalized={isActionFinalized}
                onLogsChange={setShowLogs}
                onRun={submitSelectedAction}
                onNewRun={startNewRun}
                onCancel={cancelSelectedAction}
                showTrace={!selectedActionIsHttp}
              />

              {!selectedActionIsHttp ? (
                <ActorStateSummary
                  actor={selectedAction.actor}
                  config={loadState.config}
                  refreshToken={stateRefreshToken}
                />
              ) : null}

              <div
                className={
                  isActionChatMode || selectedActionIsChat
                    ? "min-h-0 flex flex-1 flex-col overflow-hidden"
                    : "scrollbar-minimal min-h-0 flex-1 overflow-y-auto p-4"
                }
                onScroll={(event) =>
                  setIsActionHeaderCollapsed(event.currentTarget.scrollTop > 8)
                }
              >
                {selectedActionIsHttp ? (
                  <HttpActionInstructions action={selectedAction} />
                ) : (
                  <ActionForm
                    ref={actionFormRef}
                    action={selectedAction}
                    config={loadState.config}
                    resetToken={actionRunResetToken}
                    showLogs={showLogs}
                    onChatModeChange={handleActionChatModeChange}
                    onRunStateChange={setIsActionRunning}
                    onStateChange={handleStateChange}
                    onResultScrollChange={(scrollTop) =>
                      setIsActionHeaderCollapsed(scrollTop > 8)
                    }
                  />
                )}
              </div>

              {!selectedActionIsChat ? (
                <DrawerFooter className="shrink-0 flex-row bg-background mini-app:hidden">
                  {selectedActionIsHttp ? null : isActionRunning ? (
                    <Button
                      key="cancel-run"
                      type="button"
                      variant="outline"
                      onClick={cancelSelectedAction}
                    >
                      Cancel
                    </Button>
                  ) : isActionFinalized ? (
                    <Button key="new-run" type="button" onClick={startNewRun}>
                      New run
                    </Button>
                  ) : (
                    <Button key="run" type="submit" form="console-action-form">
                      Run
                    </Button>
                  )}
                  {!isActionRunning ? (
                    <DrawerClose asChild>
                      <Button type="button" variant="outline">
                        Close
                      </Button>
                    </DrawerClose>
                  ) : null}
                </DrawerFooter>
              ) : null}
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </main>
  );
}

export default Console;
