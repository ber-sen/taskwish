import { useEffect, useState } from "react";

import type { ConsoleActorState, ConsoleConfig } from "../../types";
import { Spinner } from "../ui/spinner";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compactValue(value: unknown): string {
  if (Array.isArray(value)) return `[count: ${value.length}]`;
  if (isRecord(value)) return `{count: ${Object.keys(value).length}}`;
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";
  return String(value);
}

export function ActorStateSummary({
  actor,
  config,
  refreshToken,
}: {
  actor: string;
  config: ConsoleConfig;
  refreshToken?: number;
}) {
  const [actorState, setActorState] = useState<ConsoleActorState | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    void fetch(`${config.apiPrefix}/console/state`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load actor state`);
        return response.json() as Promise<ConsoleActorState[]>;
      })
      .then((states) => {
        if (!controller.signal.aborted) {
          setActorState(states.find((state) => state.actor === actor));
        }
      })
      .catch(() => {
        // State is supplementary to the command form.
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [actor, config.apiKey, config.apiPrefix, refreshToken]);

  const displayState = actorState?.state;
  const hasState = Boolean(displayState && Object.keys(displayState).length);

  return (
    <div
      aria-label={`${actor} state summary`}
      className={
        isLoading || hasState
          ? "min-h-9 shrink-0 border-y border-dashed bg-muted/20 px-4 py-4 text-xs"
          : "h-px shrink-0 border-b border-dashed"
      }
    >
      {isLoading ? (
        <Spinner className="text-muted-foreground" />
      ) : hasState ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {Object.entries(displayState!).map(([field, value]) => (
            <span key={field} className="font-mono">
              <span className="text-muted-foreground">{field}:</span>{" "}
              <span>{compactValue(value)}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
