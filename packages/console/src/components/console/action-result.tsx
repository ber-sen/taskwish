import { cn } from "../../lib/utils";
import {
  formatActionResultBody,
  type ActionRunResult,
} from "../../lib/command-form";

export function ActionResult({ result }: { result: ActionRunResult }) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Result</h3>
        <span
          className={cn(
            "text-xs font-semibold",
            result.ok ? "text-muted-foreground" : "text-destructive"
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
