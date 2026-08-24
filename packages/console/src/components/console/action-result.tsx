import { CheckIcon, CopyIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "../ai-elements/message";
import {
  formatActionResultBody,
  type ActionRunEvent,
  type ActionRunResult,
} from "../../lib/command-form";

type RunBubble = {
  id: string;
  type: "yield" | "wire" | "result" | "error";
  body: string;
  title?: string;
};

const WIRE_TITLE_KEY = ">>";
const WIRE_SIGNAL_KEY = "->";
const WIRE_SESSION_KEY = "sessionId";

type TraceTreeNode = {
  name: string;
  entries: TraceTreeEntry[];
};

type TraceTreeEntry =
  | { type: "node"; node: TraceTreeNode }
  | { type: "line"; text: string };

function eventBody(value: unknown): string {
  return typeof value === "string"
    ? value
    : JSON.stringify(value, null, 2) ?? String(value);
}

function consoleValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => consoleValue(item)).join(", ")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return `{ ${entries
      .map(([key, item]) => `${JSON.stringify(key)}: ${consoleValue(item)}`)
      .join(", ")} }`;
  }
  return String(value);
}

function traceValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "";
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => traceValue(item)).join(", ")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return `{ ${entries
      .map(([key, item]) => `${traceKey(key)}: ${traceValue(item)}`)
      .join(", ")} }`;
  }
  return String(value);
}

function traceErrorValue(value: unknown): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const error = value as Record<string, unknown>;
    if (typeof error.content === "string") return error.content;
    if (typeof error.message === "string") return error.message;
  }

  return traceValue(value);
}

function errorBubbleBody(value: unknown): string {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "error" in value
  ) {
    return traceErrorValue((value as Record<string, unknown>).error);
  }

  return traceErrorValue(value);
}

function traceKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

function isEmptyTraceValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && !value.trim()) ||
    (Array.isArray(value) && !value.length) ||
    (typeof value === "object" &&
      !Array.isArray(value) &&
      !Object.keys(value).length)
  );
}

function wireLogBody(event: ActionRunEvent): string {
  if (event.data === null || typeof event.data !== "object") {
    return eventBody(event.data);
  }

  if (!Array.isArray(event.data) && WIRE_TITLE_KEY in event.data) {
    const { [WIRE_TITLE_KEY]: _title, ...body } = event.data as Record<
      string,
      unknown
    >;
    if (!Object.keys(body).length) return "";
    return consoleValue(body);
  }

  return consoleValue(event.data);
}

function wireLogTitle(event: ActionRunEvent): string {
  if (
    event.data !== null &&
    typeof event.data === "object" &&
    !Array.isArray(event.data) &&
    WIRE_TITLE_KEY in event.data
  ) {
    const title = (event.data as Record<string, unknown>)[WIRE_TITLE_KEY];
    return typeof title === "string" ? title : String(title);
  }

  return "Trace";
}

function isWireTreeEvent(
  event: ActionRunEvent,
): event is ActionRunEvent & { data: Record<string, unknown> } {
  return (
    event.type === "wire" &&
    event.data !== null &&
    typeof event.data === "object" &&
    !Array.isArray(event.data) &&
    (typeof (event.data as Record<string, unknown>)[WIRE_TITLE_KEY] ===
      "string" ||
      typeof (event.data as Record<string, unknown>)[WIRE_SIGNAL_KEY] ===
        "string")
  );
}

function tracePath(title: string): string[] {
  const localTitle = title.includes("::")
    ? title.slice(title.indexOf("::") + 2)
    : title;
  return localTitle.split(".").filter(Boolean);
}

function tracePayloadLine(data: Record<string, unknown>): string | null {
  const body = Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        key !== WIRE_TITLE_KEY &&
        key !== WIRE_SIGNAL_KEY &&
        key !== WIRE_SESSION_KEY &&
        value !== undefined,
    ),
  );
  const keys = Object.keys(body);

  if (!keys.length) return null;

  if ("log" in body) {
    const { log, ...rest } = body;
    const suffix = Object.keys(rest).length ? ` ${traceValue(rest)}` : "";
    return `log: ${traceValue(log)}${suffix}`;
  }

  if ("message" in body) {
    const { message, ...rest } = body;
    const suffix = Object.keys(rest).length ? ` ${traceValue(rest)}` : "";
    return `log: ${traceValue(message)}${suffix}`;
  }

  if (keys.length === 1 && "input" in body) {
    return isEmptyTraceValue(body.input)
      ? "log: Starting"
      : `log: Starting ${traceValue(body.input)}`;
  }

  if (keys.length === 1 && "result" in body) {
    return isEmptyTraceValue(body.result)
      ? "log: Done"
      : `log: Done ${traceValue(body.result)}`;
  }

  if (keys.length === 1 && "error" in body) {
    return `error: ${traceErrorValue(body.error)}`;
  }

  return `log: ${traceValue(body)}`;
}

function signalPayloadLine(data: Record<string, unknown>): string {
  const title = String(data[WIRE_SIGNAL_KEY]);
  const signalName = tracePath(title).join(".") || title;
  const body = Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        key !== WIRE_SIGNAL_KEY &&
        key !== WIRE_SESSION_KEY &&
        value !== undefined,
    ),
  );
  const suffix = Object.keys(body).length ? ` ${traceValue(body)}` : "";

  return `signal: ${signalName}${suffix}`;
}

function ensureTraceNode(
  entries: TraceTreeEntry[],
  name: string,
): TraceTreeNode {
  const existing = entries.find(
    (entry) => entry.type === "node" && entry.node.name === name,
  );
  if (existing?.type === "node") return existing.node;

  const node: TraceTreeNode = { name, entries: [] };
  entries.push({ type: "node", node });
  return node;
}

function buildTraceTree(events: ActionRunEvent[]): string {
  const roots: TraceTreeEntry[] = [];
  let currentRoot: TraceTreeNode | null = null;

  for (const event of events) {
    if (!isWireTreeEvent(event)) continue;

    if (typeof event.data[WIRE_SIGNAL_KEY] === "string") {
      const node =
        currentRoot ??
        ensureTraceNode(
          roots,
          tracePath(String(event.data[WIRE_SIGNAL_KEY]))[0] ?? "Trace",
        );
      node.entries.push({ type: "line", text: signalPayloadLine(event.data) });
      continue;
    }

    const title = String(event.data[WIRE_TITLE_KEY]);
    const path = tracePath(title);
    const rootName = path[0] ?? "Trace";
    let node = ensureTraceNode(roots, rootName);
    currentRoot = node;

    for (const segment of path.slice(1)) {
      node = ensureTraceNode(node.entries, segment);
    }

    const line = tracePayloadLine(event.data);
    if (line) node.entries.push({ type: "line", text: line });
  }

  const lines: string[] = [];
  for (const root of roots) {
    if (root.type !== "node") continue;
    lines.push(root.node.name);
    renderTraceEntries(root.node.entries, "", lines);
  }

  return lines.join("\n");
}

function renderTraceEntries(
  entries: TraceTreeEntry[],
  prefix: string,
  lines: string[],
) {
  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const branch = isLast ? "└─" : "├─";
    const childPrefix = `${prefix}${isLast ? "   " : "│  "}`;

    if (entry.type === "line") {
      lines.push(`${prefix}${branch} ${entry.text}`);
      return;
    }

    lines.push(`${prefix}${branch} ${entry.node.name}`);
    renderTraceEntries(entry.node.entries, childPrefix, lines);
  });
}

function wireEventsBody(events: ActionRunEvent[]): string {
  if (events.every(isWireTreeEvent)) return buildTraceTree(events);

  return events
    .map((event) => {
      const body = wireLogBody(event);
      return body ? `${wireLogTitle(event)}\n${body}` : wireLogTitle(event);
    })
    .join("\n");
}

function isTraceErrorLine(line: string): boolean {
  return /(?:^| )error:/.test(line);
}

function buildRunBubbles(
  result: ActionRunResult | null,
  showLogs: boolean,
): RunBubble[] {
  if (!result) return [];

  if (!result.events) {
    return [
      {
        id: "result",
        type: result.ok ? "result" : "error",
        body: formatActionResultBody(result.body),
      },
    ];
  }

  const bubbles: RunBubble[] = [];
  let currentYield = "";
  const wireEvents: ActionRunEvent[] = [];
  let wireBubble: RunBubble | null = null;
  let hasFinalEvent = false;

  const flushYield = (index: number) => {
    if (!currentYield) return;
    bubbles.push({
      id: `yield-${index}`,
      type: "yield",
      body: currentYield,
    });
    currentYield = "";
  };

  const updateWireEvents = () => {
    if (!showLogs) return;
    if (!wireBubble) {
      wireBubble = {
        id: "wire-trace",
        type: "wire",
        body: "",
        title: "Trace",
      };
      bubbles.push(wireBubble);
    }
    wireBubble.body = wireEventsBody(wireEvents);
  };

  result.events.forEach((event, index) => {
    if (event.type === "yield") {
      currentYield += eventBody(event.data);
      return;
    }

    if (event.type === "wire") {
      flushYield(index);
      wireEvents.push(event);
      updateWireEvents();
      return;
    }

    flushYield(index);
    hasFinalEvent = event.type === "result" || event.type === "error";
    bubbles.push({
      id: `${event.type}-${index}`,
      type: event.type === "error" ? "error" : "result",
      body:
        event.type === "error"
          ? errorBubbleBody(event.data)
          : eventBody(event.data),
    });
  });

  flushYield(result.events.length);
  if (!result.streaming && !hasFinalEvent) {
    bubbles.push({
      id: "result-done",
      type: result.ok ? "result" : "error",
      body: result.ok ? "Done" : `${result.status}`,
    });
  }
  return bubbles;
}

function yamlScalar(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value !== "string") return JSON.stringify(value) ?? String(value);
  if (!value) return '""';
  if (value.includes("\n")) {
    return `|\n${value
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n")}`;
  }
  if (/[:#{}\[\],&*?|\-<>=!%@`"']|\s$|^\s|^(true|false|null)$/i.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function yamlValue(value: unknown, depth = 0): string {
  const indent = "  ".repeat(depth);
  const childIndent = "  ".repeat(depth + 1);

  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return value
      .map((item) => {
        if (
          Array.isArray(item) ||
          (typeof item === "object" && item !== null)
        ) {
          return `${indent}-\n${yamlValue(item, depth + 1)}`;
        }
        return `${indent}- ${yamlScalar(item)}`;
      })
      .join("\n");
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    if (!entries.length) return "{}";
    return entries
      .map(([key, item]) => {
        if (
          Array.isArray(item) ||
          (typeof item === "object" && item !== null)
        ) {
          return `${indent}${key}:\n${yamlValue(item, depth + 1)}`;
        }
        const scalar = yamlScalar(item);
        if (scalar.startsWith("|\n")) {
          return `${indent}${key}: ${scalar.replace(
            /\n/g,
            `\n${childIndent}`,
          )}`;
        }
        return `${indent}${key}: ${scalar}`;
      })
      .join("\n");
  }

  return `${indent}${yamlScalar(value)}`;
}

function inputBody(input: unknown): string {
  if (
    input === null ||
    input === undefined ||
    (typeof input === "string" && !input.trim()) ||
    (Array.isArray(input) && !input.length) ||
    (typeof input === "object" &&
      !Array.isArray(input) &&
      !Object.keys(input).length)
  ) {
    return "Empty";
  }

  return yamlValue(input);
}

function chatInputBody(input: unknown): string {
  if (
    input === null ||
    input === undefined ||
    (typeof input === "object" &&
      !Array.isArray(input) &&
      !Object.keys(input).length)
  ) {
    return "";
  }

  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    for (const key of ["content", "prompt", "message", "text"]) {
      const value = (input as Record<string, unknown>)[key];
      if (typeof value === "string") return value;
    }
  }

  return inputBody(input);
}

function ResultCopyButton({
  text,
  timeout = 2000,
}: {
  text: string;
  timeout?: number;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<number>(0);

  const copyToClipboard = useCallback(async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      return;
    }

    if (isCopied) return;

    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    timeoutRef.current = window.setTimeout(() => setIsCopied(false), timeout);
  }, [isCopied, text, timeout]);

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      aria-label={isCopied ? "Copied" : "Copy result"}
      className="h-6 w-6 bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground focus:bg-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:bg-transparent"
      disabled={!text}
      onClick={copyToClipboard}
      size="icon-sm"
      title={isCopied ? "Copied" : "Copy result"}
      type="button"
      variant="ghost"
    >
      <Icon className="size-3.5" size={14} />
    </Button>
  );
}

export function ActionResult({
  className,
  input,
  result,
  runs,
  chat,
  showLogs,
  onScrollChange,
}: {
  className?: string;
  input?: unknown;
  result?: ActionRunResult | null;
  runs?: { id: string; input: unknown; result: ActionRunResult | null }[];
  chat?: boolean;
  showLogs: boolean;
  onScrollChange?: (scrollTop: number) => void;
}) {
  const runItems =
    runs ??
    (input !== undefined ? [{ id: "run", input, result: result ?? null }] : []);

  return (
    <Conversation className={cn("relative min-h-0 flex-1", className)}>
      <ActionResultScrollObserver onScrollChange={onScrollChange} />
      <ConversationContent className="space-y-4 px-4 py-4 pb-12">
        {runItems.length ? (
          runItems.flatMap((run) => {
            const bubbles = buildRunBubbles(run.result, showLogs).filter(
              (bubble) => !chat || bubble.type !== "result",
            );
            const waiting = !run.result || run.result.streaming;
            const chatInput = chat ? chatInputBody(run.input) : "";
            return [
              chat && !chatInput ? null : (
                <Message key={`${run.id}-input`} from="user">
                  {!chat ? (
                    <div className="self-end text-[11px] font-semibold text-muted-foreground">
                      Input
                    </div>
                  ) : null}
                  <MessageContent
                    className="space-y-2"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    <MessageResponse className="text-primary-foreground">
                      {chat ? chatInput : inputBody(run.input)}
                    </MessageResponse>
                  </MessageContent>
                </Message>
              ),
              ...(bubbles.length
                ? bubbles.map((bubble) =>
                    bubble.type === "yield" ? (
                      <Message key={`${run.id}-${bubble.id}`} from="assistant">
                        <div
                          className="max-w-[88%] px-1 py-1 text-foreground"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          <MessageResponse>{bubble.body}</MessageResponse>
                        </div>
                      </Message>
                    ) : (
                      <Message key={`${run.id}-${bubble.id}`} from="assistant">
                        <div className="flex max-w-full items-center gap-1">
                          <div
                            className={cn(
                              "text-[11px] font-semibold text-muted-foreground",
                              bubble.type === "error" && "text-destructive",
                            )}
                          >
                            {bubble.type === "wire"
                              ? bubble.title
                              : bubble.type === "error"
                              ? "Error"
                              : "Result"}
                          </div>
                          {bubble.type === "result" ||
                          bubble.type === "error" ? (
                            <ResultCopyButton text={bubble.body} />
                          ) : null}
                        </div>
                        <MessageContent
                          className={cn(
                            bubble.type === "wire" &&
                              "border-l-[1.5px] border-border px-4 py-3 text-muted-foreground",
                            bubble.type === "result" &&
                              "rounded-lg border border-border bg-action px-4 py-3 text-foreground",
                            bubble.type === "error" &&
                              "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive",
                          )}
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {bubble.type === "wire" ? (
                            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-4 text-black">
                              {(bubble.body || "Done")
                                .split("\n")
                                .map((line, index) => (
                                  <span
                                    key={`${run.id}-${bubble.id}-line-${index}`}
                                    className={cn(
                                      "block",
                                      isTraceErrorLine(line) &&
                                        "text-destructive",
                                    )}
                                  >
                                    {line}
                                  </span>
                                ))}
                            </pre>
                          ) : (
                            <MessageResponse>{bubble.body}</MessageResponse>
                          )}
                        </MessageContent>
                      </Message>
                    ),
                  )
                : waiting
                ? [
                    <Message key={`${run.id}-waiting`} from="assistant">
                      <MessageContent className="border-dashed text-muted-foreground">
                        Waiting for output
                      </MessageContent>
                    </Message>,
                  ]
                : []),
            ];
          })
        ) : (
          <Message from="assistant">
            <MessageContent className="border-dashed text-muted-foreground">
              Send a message to start chatting
            </MessageContent>
          </Message>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

function ActionResultScrollObserver({
  onScrollChange,
}: {
  onScrollChange?: (scrollTop: number) => void;
}) {
  const { scrollRef } = useStickToBottomContext();

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement || !onScrollChange) return;

    const notify = () => onScrollChange(scrollElement.scrollTop);
    notify();
    scrollElement.addEventListener("scroll", notify, { passive: true });
    return () => scrollElement.removeEventListener("scroll", notify);
  }, [onScrollChange, scrollRef]);

  return null;
}
