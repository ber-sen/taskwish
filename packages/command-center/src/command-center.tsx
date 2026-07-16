import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Copy, Play, Search, X } from "lucide-react";

import ActorArtwork from "./components/console/actor-artwork";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./components/ui/drawer";
import { Button } from "./components/ui/button";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { cn } from "./lib/utils";
import type {
  CommandCenterAction,
  CommandCenterConfig,
  CommandCenterInputField,
} from "./types";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; config: CommandCenterConfig }
  | { status: "error"; message: string };

const defaultFields: CommandCenterInputField[] = [
  { name: "input", description: "JSON input passed to the action." },
];

function splitActionName(
  id: string,
): Pick<CommandCenterAction, "actor" | "action" | "label"> {
  const [actor = "Taskwish", action = id] = id.split("::");
  const label = action
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return { actor, action, label: label || action };
}

function hashColor(value: string): string {
  const colors = [
    "#f59e0b",
    "#10b981",
    "#6366f1",
    "#ec4899",
    "#3b82f6",
    "#8b5cf6",
    "#ef4444",
    "#14b8a6",
  ];
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return colors[hash % colors.length]!;
}

function normalizeAction(raw: CommandCenterAction): CommandCenterAction {
  const parsed = splitActionName(raw.id);
  return {
    ...parsed,
    ...raw,
    input: raw.input.length ? raw.input : defaultFields,
    color: raw.color || hashColor(raw.actor || parsed.actor),
  };
}

async function loadConfig(): Promise<CommandCenterConfig> {
  const response = await fetch("/tw/command-center/config");
  if (!response.ok) {
    throw new Error(`Unable to load command center (${response.status})`);
  }
  const config = (await response.json()) as CommandCenterConfig;
  return {
    ...config,
    actions: config.actions.map(normalizeAction),
  };
}

function getActionValue(action: CommandCenterAction) {
  return action.id;
}

function actionTitle(action: CommandCenterAction) {
  return action.label || action.action;
}

function actionDescription(action: CommandCenterAction) {
  return action.description || `${action.actor} action`;
}

function ActionIcon({ action }: { action: CommandCenterAction }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-transparent text-primary"
    >
      {action.source === "http" ? (
        <Copy className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4 fill-current" />
      )}
    </span>
  );
}

function ActionCommandItem({
  action,
  onSelect,
}: {
  action: CommandCenterAction;
  onSelect: (action: CommandCenterAction) => void;
}) {
  return (
    <CommandPrimitive.Item
      value={getActionValue(action)}
      keywords={[
        actionTitle(action),
        action.actor,
        actionDescription(action),
        action.source,
      ]}
      onSelect={() => onSelect(action)}
      className={cn(
        "group flex h-full min-h-[130px] w-full cursor-pointer flex-col rounded-2xl border border-border bg-action/70 p-4 text-left transition-[background-color,border-color,box-shadow] duration-100 hover:bg-action data-[selected=true]:border-transparent data-[selected=true]:ring-2 data-[selected=true]:ring-landing-primary md:min-h-[150px]",
        "outline-none",
      )}
    >
      <div className="flex flex-col gap-2">
        <span className="break-words font-semibold leading-tight text-foreground sm:text-lg">
          {actionTitle(action)}
        </span>
      </div>

      <div className="mt-auto flex min-w-0 items-end justify-between gap-2 pt-3">
        <span className="flex min-w-0 flex-col items-start gap-0.5 truncate text-xs font-semibold text-foreground/80">
          <ActorArtwork
            color={action.color}
            className="h-[30px] w-[30px] shrink-0"
          />
          {action.actor}
        </span>
        <ActionIcon action={action} />
      </div>
    </CommandPrimitive.Item>
  );
}

function fieldDefaultValue(field: CommandCenterInputField): string {
  if (field.example === undefined) return "";
  if (typeof field.example === "string") return field.example;
  return JSON.stringify(field.example, null, 2);
}

function parseFieldValue(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function buildPayload(form: HTMLFormElement, fields: CommandCenterInputField[]) {
  if (fields.length === 1 && fields[0]?.name === "input") {
    const value = String(new FormData(form).get("input") ?? "");
    const parsed = parseFieldValue(value);
    return parsed === undefined ? {} : parsed;
  }

  const data = new FormData(form);
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const parsed = parseFieldValue(String(data.get(field.name) ?? ""));
    if (parsed !== undefined) payload[field.name] = parsed;
  }
  return payload;
}

function ActionDrawerHeader({
  action,
  collapsed,
  onRun,
}: {
  action: CommandCenterAction;
  collapsed: boolean;
  onRun: () => void;
}) {
  return (
    <DrawerHeader
      className={`relative shrink-0 text-left transition-all duration-200 mini-app:pt-[100px] ${collapsed && "pb-2"}`}
    >
      <div className="relative">
        <Button
          type="button"
          className="absolute top-0.5 right-0 hidden h-9 rounded-full px-4 mini-app:inline-flex"
          onClick={onRun}
        >
          Run
        </Button>
        <DrawerClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute -right-2 -top-2 h-9 w-9 rounded-full mini-app:hidden"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerClose>
      </div>
      {!collapsed && (
        <div className="flex items-center gap-3 text-sm font-semibold text-foreground/80">
          <ActorArtwork color={action.color} />
        </div>
      )}
      <div className="flex gap-3">
        {collapsed && (
          <ActorArtwork
            color={action.color}
            className="h-[30px] w-[30px] shrink-0"
          />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <DrawerTitle className="truncate">{actionTitle(action)}</DrawerTitle>
          <DrawerDescription className="truncate">
            {collapsed ? action.actor : actionDescription(action)}
          </DrawerDescription>
        </div>
      </div>
    </DrawerHeader>
  );
}

function ActionForm({
  action,
  config,
  onComplete,
}: {
  action: CommandCenterAction;
  config: CommandCenterConfig;
  onComplete: () => void;
}) {
  const [isRunning, setIsRunning] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsRunning(true);

    try {
      const payload = buildPayload(event.currentTarget, action.input);
      await fetch(action.route, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      onComplete();
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <form id="command-center-action-form" className="space-y-4" onSubmit={submit}>
      {action.input.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={`command-${field.name}`}>{field.name}</Label>
          <Textarea
            id={`command-${field.name}`}
            name={field.name}
            defaultValue={fieldDefaultValue(field)}
            placeholder={field.description || "JSON or text"}
            className="min-h-[110px] resize-none"
            disabled={isRunning}
          />
        </div>
      ))}
      <input type="submit" hidden disabled={isRunning} />
    </form>
  );
}

export function CommandCenter() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] =
    useState<CommandCenterAction | null>(null);
  const [isActionHeaderCollapsed, setIsActionHeaderCollapsed] = useState(false);
  const [selectedValue, setSelectedValue] = useState("");
  const commandRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadConfig()
      .then((config) => {
        if (!cancelled) {
          setLoadState({ status: "ready", config });
          setSelectedValue(config.actions[0]?.id ?? "");
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
  }, []);

  useEffect(() => {
    setIsActionHeaderCollapsed(false);
  }, [selectedAction]);

  const actions = useMemo(
    () => (loadState.status === "ready" ? loadState.config.actions : []),
    [loadState],
  );

  const getVisibleActionValues = () =>
    Array.from(
      commandRef.current?.querySelectorAll<HTMLElement>(
        '[cmdk-item=""]:not([aria-disabled="true"])',
      ) ?? [],
    )
      .map((item) => item.dataset.value)
      .filter((value): value is string => Boolean(value));

  const getColumnCount = () =>
    window.matchMedia("(min-width: 640px)").matches ? 3 : 2;

  const handleActionGridKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
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

  if (loadState.status === "loading") {
    return (
      <main className="mx-auto grid min-h-screen place-items-center bg-background p-4 text-sm text-muted-foreground">
        Loading Command Center
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

  const submitSelectedAction = () => {
    document
      .getElementById("command-center-action-form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  };

  return (
    <main className="min-h-screen bg-background px-4 pb-16 pt-16 text-foreground">
      <CommandPrimitive
        ref={commandRef}
        label="Command Center"
        value={selectedValue}
        onValueChange={setSelectedValue}
        onKeyDown={handleActionGridKeyDown}
        disablePointerSelection
        className="mx-auto flex w-full max-w-4xl flex-col bg-transparent text-foreground"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold leading-tight text-foreground">
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
              autoFocus
              className="flex h-11 w-full rounded-lg border border-input bg-background py-1 pl-9 pr-2 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
        <div className="mx-auto mt-6 w-full max-w-2xl pb-8">
          <CommandPrimitive.List className="[&_[cmdk-list-sizer]]:grid [&_[cmdk-list-sizer]]:grid-cols-2 [&_[cmdk-list-sizer]]:gap-3 sm:[&_[cmdk-list-sizer]]:grid-cols-3">
            <CommandPrimitive.Empty className="col-span-full py-16 text-center text-sm text-muted-foreground">
              No actions found for &ldquo;{search}&rdquo;
            </CommandPrimitive.Empty>
            {actions.map((action) => (
              <ActionCommandItem
                key={action.id}
                action={action}
                onSelect={(selected) => setSelectedAction(selected)}
              />
            ))}
          </CommandPrimitive.List>
        </div>
      </CommandPrimitive>

      <Drawer
        open={Boolean(selectedAction)}
        swipeDirection="right"
        disableGestures
        onOpenChange={(open) => {
          if (!open) setSelectedAction(null);
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
                onRun={submitSelectedAction}
              />

              <div
                className="scrollbar-minimal min-h-0 flex-1 overflow-y-auto p-4"
                onScroll={(event) =>
                  setIsActionHeaderCollapsed(event.currentTarget.scrollTop > 8)
                }
              >
                <ActionForm
                  action={selectedAction}
                  config={loadState.config}
                  onComplete={() => setSelectedAction(null)}
                />
              </div>

              <DrawerFooter className="shrink-0 flex-row border-t bg-background mini-app:hidden">
                <Button type="submit" form="command-center-action-form">
                  Run
                </Button>
                <DrawerClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </main>
  );
}

export default CommandCenter;
