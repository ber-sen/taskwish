import { CheckIcon, CopyIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

function buildRunBubbles(
  result: ActionRunResult | null,
  showLogs: boolean
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

  result.events.forEach((event, index) => {
    if (event.type === "yield") {
      currentYield += eventBody(event.data);
      return;
    }

    if (event.type === "wire") {
      flushYield(index);
      if (showLogs) {
        bubbles.push({
          id: `wire-${index}`,
          type: "wire",
          body: wireLogBody(event),
          title: wireLogTitle(event),
        });
      }
      return;
    }

    flushYield(index);
    hasFinalEvent = event.type === "result" || event.type === "error";
    bubbles.push({
      id: `${event.type}-${index}`,
      type: event.type === "error" ? "error" : "result",
      body: eventBody(event.data),
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
        if (Array.isArray(item) || (typeof item === "object" && item !== null)) {
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
        if (Array.isArray(item) || (typeof item === "object" && item !== null)) {
          return `${indent}${key}:\n${yamlValue(item, depth + 1)}`;
        }
        const scalar = yamlScalar(item);
        if (scalar.startsWith("|\n")) {
          return `${indent}${key}: ${scalar.replace(/\n/g, `\n${childIndent}`)}`;
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
    []
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
  showLogs,
}: {
  className?: string;
  input: unknown;
  result: ActionRunResult | null;
  showLogs: boolean;
}) {
  const bubbles = buildRunBubbles(result, showLogs);

  return (
    <Conversation className={cn("relative min-h-0 flex-1", className)}>
      <ConversationContent className="space-y-4 px-0 py-4 pb-12">
        <Message from="user">
          <div className="self-end text-[11px] font-semibold text-muted-foreground">
            Input
          </div>
          <MessageContent
            className="space-y-2"
            style={{ overflowWrap: "anywhere" }}
          >
            <MessageResponse className="text-primary-foreground">
              {inputBody(input)}
            </MessageResponse>
          </MessageContent>
        </Message>

        {bubbles.length ? (
          bubbles.map((bubble) =>
            bubble.type === "yield" ? (
              <Message key={bubble.id} from="assistant">
                <div
                  className="max-w-[88%] px-1 py-1 text-foreground"
                  style={{ overflowWrap: "anywhere" }}
                >
                  <MessageResponse>{bubble.body}</MessageResponse>
                </div>
              </Message>
            ) : (
              <Message key={bubble.id} from="assistant">
                <div className="flex max-w-full items-center gap-1">
                  <div
                    className={cn(
                      "text-[11px] font-semibold text-muted-foreground",
                      bubble.type === "error" && "text-destructive"
                    )}
                  >
                    {bubble.type === "wire"
                      ? bubble.title
                      : bubble.type === "error"
                      ? "Error"
                      : "Result"}
                  </div>
                  {bubble.type === "result" || bubble.type === "error" ? (
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
                      "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive"
                  )}
                  style={{ overflowWrap: "anywhere" }}
                >
                  {bubble.type === "wire" ? (
                    <pre className="whitespace-pre-wrap font-mono text-[11px] leading-4 text-black">
                      {bubble.body || "Done"}
                    </pre>
                  ) : (
                    <MessageResponse>{bubble.body}</MessageResponse>
                  )}
                </MessageContent>
              </Message>
            )
          )
        ) : (
          <Message from="assistant">
            <MessageContent className="border-dashed text-muted-foreground">
              Waiting for output
            </MessageContent>
          </Message>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
