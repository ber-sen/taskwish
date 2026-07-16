import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { ChevronDown, ChevronUp, Copy, Play, Search, X } from "lucide-react";

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
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { cn } from "./lib/utils";
import type {
  CommandCenterAction,
  CommandCenterConfig,
  CommandCenterJsonSchema,
  CommandCenterInputField,
} from "./types";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; config: CommandCenterConfig }
  | { status: "error"; message: string };

type ActionRunResult = {
  status: number;
  ok: boolean;
  contentType: string;
  body: unknown;
};

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

function uppercaseFirst(value: string): string {
  return value ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value;
}

function isVisibleAction(action: CommandCenterAction): boolean {
  return !action.action.toLowerCase().startsWith("on");
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
  const label = uppercaseFirst(raw.label || parsed.label || parsed.action);
  return {
    ...parsed,
    ...raw,
    label,
    input: raw.input,
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
    actions: config.actions.map(normalizeAction).filter(isVisibleAction),
  };
}

function getActionValue(action: CommandCenterAction) {
  return action.id;
}

function actionTitle(action: CommandCenterAction) {
  return action.label || action.action;
}

function actionDescription(action: CommandCenterAction) {
  return action.description || action.actor;
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

function TaskWishLogo() {
  return (
    <svg
      width="40"
      viewBox="0 0 48 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary md:group-hover:invisible"
      aria-hidden="true"
    >
      <g clipPath="url(#clip0_953_316)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M47.3282 4.08451L32.2327 20L22.748 10L26.4885 6.05634L32.2327 11.9718L43.5877 0L47.3282 4.08451Z"
          fill="#00FFAF"
        />
        <path
          d="M9.64672 20L25 4.08451L21.1956 0L9.64672 11.9718L3.80434 6.05634L0 10L9.64672 20Z"
          fill="url(#paint0_linear_953_316)"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_953_316"
          x1="4.16667"
          y1="-5.90909"
          x2="24.5859"
          y2="16.737"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#00249C" />
          <stop offset="1" stopColor="#00FFAF" />
        </linearGradient>
        <clipPath id="clip0_953_316">
          <rect width="48" height="20" fill="white" />
        </clipPath>
      </defs>
    </svg>
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
        {action.description ? (
          <span className="overflow-hidden text-xs leading-snug text-muted-foreground [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box]">
            {action.description}
          </span>
        ) : null}
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
  if (field.defaultValue === undefined) return "";
  if (typeof field.defaultValue === "string") return field.defaultValue;
  return JSON.stringify(field.defaultValue, null, 2);
}

function schemaType(
  schema: CommandCenterJsonSchema | undefined,
): string | undefined {
  if (Array.isArray(schema?.type)) {
    return schema.type.find((value) => value !== "null");
  }
  return schema?.type;
}

function isJsonField(field: CommandCenterInputField): boolean {
  const type = schemaType(field.schema);
  return type === "object" || type === "array" || !type;
}

function fieldPlaceholder(field: CommandCenterInputField): string {
  const type = schemaType(field.schema);
  if (field.example !== undefined) {
    const placeholder =
      typeof field.example === "string"
        ? field.example
        : (JSON.stringify(field.example) ?? String(field.example));
    return uppercaseFirst(placeholder);
  }
  if (type === "number" || type === "integer") return "0";
  if (type === "boolean") return "";
  if (type === "string") return uppercaseFirst(field.name);
  return "JSON";
}

function parseJsonValue(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function parseFieldValue(
  field: CommandCenterInputField,
  value: FormDataEntryValue | null,
): unknown {
  const type = schemaType(field.schema);
  const raw = String(value ?? "");
  const trimmed = raw.trim();
  const enumValues = field.schema?.enum;

  if (type === "boolean") return value !== null;
  if (!trimmed) return undefined;

  if (Array.isArray(enumValues)) {
    const enumValueMatch = enumValues.find((item) => enumValue(item) === raw);
    if (enumValueMatch !== undefined) return enumValueMatch;
  }

  if (type === "number" || type === "integer") {
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      throw new Error(`${field.name} must be a number`);
    }
    return parsed;
  }

  if (type === "string") return raw;

  if (isJsonField(field)) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error(`${field.name} must be valid JSON`);
    }
  }

  return parseJsonValue(raw);
}

function buildPayload(form: HTMLFormElement, fields: CommandCenterInputField[]) {
  if (fields.length === 1 && fields[0]?.name === "input") {
    const parsed = parseFieldValue(fields[0], new FormData(form).get("input"));
    return parsed === undefined ? {} : parsed;
  }

  const data = new FormData(form);
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const parsed = parseFieldValue(field, data.get(field.name));
    if (parsed !== undefined) payload[field.name] = parsed;
  }
  return payload;
}

async function parseActionResponse(response: Response): Promise<ActionRunResult> {
  const contentType = response.headers.get("Content-Type") ?? "";
  const body =
    response.status === 204
      ? null
      : contentType.includes("application/json")
        ? await response.json()
        : await response.text();

  return {
    status: response.status,
    ok: response.ok,
    contentType,
    body,
  };
}

function formatActionResultBody(body: unknown): string {
  if (body === null) return "null";
  if (body === undefined) return "";
  if (typeof body === "string") return body;
  return JSON.stringify(body, null, 2);
}

function enumValue(value: unknown): string {
  return typeof value === "string"
    ? value
    : JSON.stringify(value) ?? String(value);
}

function FieldDescription({ field }: { field: CommandCenterInputField }) {
  if (!field.description) return null;
  return <p className="text-xs text-muted-foreground">{field.description}</p>;
}

function ActionInputField({
  field,
  disabled,
  autoFocus,
}: {
  field: CommandCenterInputField;
  disabled: boolean;
  autoFocus?: boolean;
}) {
  const id = `command-${field.name}`;
  const type = schemaType(field.schema);
  const enumValues = field.schema?.enum;
  const defaultValue = fieldDefaultValue(field);
  const label = (
    <Label htmlFor={id} className="flex items-center gap-1">
      {uppercaseFirst(field.name)}
      {field.required ? <span className="text-muted-foreground">*</span> : null}
    </Label>
  );

  if (Array.isArray(enumValues)) {
    return (
      <div className="space-y-2">
        {label}
        <select
          id={id}
          name={field.name}
          defaultValue={defaultValue}
          disabled={disabled}
          autoFocus={autoFocus}
          className="flex h-[38px] w-full rounded-md border border-input bg-transparent px-2 py-1 text-base transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!field.required ? <option value="">Select...</option> : null}
          {enumValues.map((value) => (
            <option key={enumValue(value)} value={enumValue(value)}>
              {enumValue(value)}
            </option>
          ))}
        </select>
        <FieldDescription field={field} />
      </div>
    );
  }

  if (type === "boolean") {
    return (
      <div className="space-y-2">
        <label
          htmlFor={id}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <input
            id={id}
            name={field.name}
            type="checkbox"
            defaultChecked={field.example === true}
            disabled={disabled}
            autoFocus={autoFocus}
            className="h-4 w-4 rounded border border-input accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span>
            {uppercaseFirst(field.name)}
            {field.required ? (
              <span className="ml-1 text-muted-foreground">*</span>
            ) : null}
          </span>
        </label>
        <FieldDescription field={field} />
      </div>
    );
  }

  if (type === "string" || type === "number" || type === "integer") {
    return (
      <div className="space-y-2">
        {label}
        <Input
          id={id}
          name={field.name}
          type={type === "string" ? "text" : "number"}
          step={type === "integer" ? "1" : "any"}
          defaultValue={defaultValue}
          placeholder={fieldPlaceholder(field)}
          disabled={disabled}
          autoFocus={autoFocus}
        />
        <FieldDescription field={field} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label}
      <Textarea
        id={id}
        name={field.name}
        defaultValue={defaultValue}
        placeholder={fieldPlaceholder(field)}
        className="min-h-[110px] resize-none"
        disabled={disabled}
        autoFocus={autoFocus}
      />
      <FieldDescription field={field} />
    </div>
  );
}

function ActionResult({ result }: { result: ActionRunResult }) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Result</h3>
        <span
          className={cn(
            "text-xs font-semibold",
            result.ok ? "text-muted-foreground" : "text-destructive",
          )}
        >
          {result.status}
        </span>
      </div>
      <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-background p-3 text-xs text-foreground">
        {formatActionResultBody(result.body)}
      </pre>
    </div>
  );
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
}: {
  action: CommandCenterAction;
  config: CommandCenterConfig;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionRunResult | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  useEffect(() => {
    setError(null);
    setResult(null);
    setShowOptionalFields(false);
  }, [action.id]);

  const requiredFields = action.input.filter((field) => field.required);
  const optionalFields = action.input.filter((field) => !field.required);
  const visibleFields = showOptionalFields
    ? action.input
    : requiredFields.length
      ? requiredFields
      : [];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const payload = buildPayload(event.currentTarget, visibleFields);
      const response = await fetch(action.route, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      setResult(await parseActionResponse(response));
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <form id="command-center-action-form" className="space-y-4" onSubmit={submit}>
      {visibleFields.map((field, index) => (
        <ActionInputField
          key={field.name}
          field={field}
          disabled={isRunning}
          autoFocus={index === 0}
        />
      ))}
      {optionalFields.length ? (
        <Button
          type="button"
          variant="ghost"
          className="h-9 px-3 hover:bg-transparent hover:text-inherit focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          disabled={isRunning}
          onClick={() => setShowOptionalFields((value) => !value)}
        >
          {showOptionalFields ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {showOptionalFields ? "Hide options" : "Show more options"}
        </Button>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {result ? <ActionResult result={result} /> : null}
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
    <main className="relative min-h-screen bg-background px-4 pb-16 pt-16 text-foreground">
      <a
        href="/"
        aria-label="TaskWish"
        className="absolute left-4 top-4 z-40 flex items-center"
      >
        <TaskWishLogo />
      </a>

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
