import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "../ui/button";
import { httpRequestExample, httpRouteForAction } from "../../lib/http-actions";
import type { ConsoleAction } from "../../types";

export function HttpActionInstructions({ action }: { action: ConsoleAction }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const route = httpRouteForAction(action);

  useEffect(() => setOrigin(window.location.origin), []);
  const example = useMemo(
    () => httpRequestExample(action, origin),
    [action, origin],
  );

  if (!route) {
    return (
      <p className="text-sm text-muted-foreground">
        Route information is unavailable for this HTTP endpoint.
      </p>
    );
  }

  const copy = async () => {
    if (!example) return;
    await navigator.clipboard.writeText(example);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">HTTP endpoint</h2>
        <p className="text-sm text-muted-foreground">
          Call this action by sending an HTTP request to its route.
        </p>
        <div className="flex items-center overflow-hidden rounded-md border bg-muted/30 font-mono text-sm">
          <span className="border-r px-3 py-2 font-semibold text-foreground">
            {route.method}
          </span>
          <span className="min-w-0 overflow-x-auto px-3 py-2">
            {route.path}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Request example</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 px-2"
            disabled={!example}
            onClick={() => void copy()}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="scrollbar-minimal overflow-x-auto rounded-md border bg-muted/30 p-4 text-xs leading-relaxed text-foreground">
          <code>{example ?? "Loading request example…"}</code>
        </pre>
      </div>
    </div>
  );
}
