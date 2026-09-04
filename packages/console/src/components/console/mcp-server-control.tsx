import { useEffect, useMemo, useState } from "react";
import { Copy, ChevronRight, Eye, EyeOff, X } from "lucide-react";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerClose,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Switch } from "../ui/switch";
import type { ConsoleConfig, ConsoleMcpTool } from "../../types";

function McpGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="19 14 150 176"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M25 97.8528L92.8823 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M76.2653 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M109.853 46.9411L59.6482 97.1457C50.2757 106.518 50.2757 121.714 59.6482 131.087C69.0208 140.459 84.2168 140.459 93.5894 131.087L143.794 80.8822"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  );
}
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  return (
    <Button
      type="button"
      variant="outline"
      className="flex shrink-0 flex-row items-center justify-center gap-2 px-8"
      onClick={() => void copy()}
    >
      <Copy className="h-4 w-4" aria-hidden="true" />
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
const actorOf = (tool: ConsoleMcpTool) => tool.action.split("::")[0] || "Other";

export function McpServerControl({ config }: { config: ConsoleConfig }) {
  const [origin, setOrigin] = useState("");
  const [format, setFormat] = useState<"URL" | "JSON" | "Inspector">("URL");
  const [expanded, setExpanded] = useState(true);
  const [revealKey, setRevealKey] = useState(false);
  const allTools = useMemo(
    () => config.mcp.endpoints.flatMap((endpoint) => endpoint.tools),
    [config.mcp.endpoints]
  );
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => setSelected(allTools.map((tool) => tool.action)), [allTools]);
  const groups = useMemo(() => {
    const map = new Map<string, ConsoleMcpTool[]>();
    allTools.forEach((tool) =>
      map.set(actorOf(tool), [...(map.get(actorOf(tool)) ?? []), tool])
    );
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allTools]);
  const selectedTools = allTools.filter((tool) =>
    selected.includes(tool.action)
  );
  const endpointPath = "/mcp";
  const url = `${origin}${endpointPath}?commands=${encodeURIComponent(
    selectedTools.map((tool) => tool.action).join(",")
  )}`;
  const json = JSON.stringify(
    {
      mcpServers: {
        [config.nodeName]: {
          url,
          headers: { Authorization: `Bearer ${config.apiKey}` },
        },
      },
    },
    null,
    2
  );
  const allSelected =
    allTools.length > 0 && selectedTools.length === allTools.length;
  const toggle = (action: string) =>
    setSelected((current) =>
      current.includes(action)
        ? current.filter((item) => item !== action)
        : [...current, action]
    );
  return (
    <div className="fixed bottom-4 right-4 z-40 mini-app:bottom-8">
      <Drawer
        swipeDirection="right"
        disableGestures
        onOpenChange={(open) => !open && setRevealKey(false)}
      >
        <DrawerTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-full border-0 bg-transparent px-3 shadow-none hover:bg-muted/60"
            aria-label="MCP server"
          >
            <McpGlyph className="h-6 w-6" />
            <span className="hidden text-sm sm:inline">MCP server</span>
            <span
              className={`h-2 w-2 rounded-full ${
                config.mcp.enabled ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
              aria-hidden="true"
            />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="overflow-hidden rounded-none [--drawer-inset:0px] [--drawer-max-width:100vw] [--drawer-width:100vw] sm:rounded-2xl sm:[--drawer-inset:12px] sm:[--drawer-max-width:520px] sm:[--drawer-width:calc(100vw-24px)] lg:[--drawer-max-width:600px]">
          <DrawerHeader className="sticky top-0 z-10 shrink-0 bg-background p-4 text-left transition-all duration-200 sm:p-5">
            <div className="relative">
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 -top-2 h-9 w-9 rounded-full"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
            <div className="flex gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <DrawerTitle className="truncate">MCP server</DrawerTitle>
                <DrawerDescription className="truncate">
                  Select a command format.
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            {config.mcp.enabled ? (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">Configuration</span>
                  <button
                    type="button"
                    className="flex h-9 w-full items-center justify-between rounded-md border bg-action/40 px-3 text-left text-sm font-medium text-primary hover:bg-action"
                    onClick={() => setExpanded((value) => !value)}
                  >
                    <span>Commands ({selectedTools.length})</span>
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${
                        expanded ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  {expanded ? (
                    <div className="scroll-visible flex h-72 flex-col overflow-scroll rounded-md border">
                      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-popover px-3 py-2">
                        <span className="text-sm font-semibold">
                          Select Commands
                        </span>
                        <Switch
                          checked={allSelected}
                          onCheckedChange={(checked) =>
                            setSelected(
                              checked ? allTools.map((tool) => tool.action) : []
                            )
                          }
                          aria-label="Toggle all commands"
                          size="sm"
                        />
                      </div>
                      <div className="flex flex-col px-3 pb-2">
                        {groups.map(([actor, tools]) => (
                          <div key={actor} className="flex flex-col">
                            <span className="py-1 text-xs font-semibold uppercase text-muted-foreground">
                              {actor}
                            </span>
                            {tools.map((tool) => (
                              <div
                                key={tool.action}
                                className="flex min-h-10 items-center justify-between gap-4 border-b border-border/60 py-2 last:border-b-0"
                              >
                                <span className="min-w-0 truncate text-sm">
                                  {tool.name}
                                </span>
                                <Switch
                                  checked={selected.includes(tool.action)}
                                  onCheckedChange={() => toggle(tool.action)}
                                  aria-label={`Toggle ${actor}: ${tool.name}`}
                                  size="sm"
                                />
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="p-2 text-sm text-muted-foreground">
                Enable MCP in the node configuration to expose actor actions to
                MCP clients.
              </div>
            )}
          </div>
          {config.mcp.enabled ? (
            <DrawerFooter className="flex flex-col gap-3 border-t p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Code example</span>
                <div
                  role="group"
                  aria-label="Command format"
                  className="flex items-center justify-center gap-1 rounded-full border p-1"
                >
                  {(["URL", "JSON", "Inspector"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="radio"
                      aria-checked={format === item}
                      data-state={format === item ? "on" : "off"}
                      className="inline-flex min-w-8 h-7 items-center justify-center rounded-full px-2 text-xs font-medium hover:bg-muted data-[state=on]:bg-primary data-[state=on]:text-white"
                      onClick={() => setFormat(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <pre className="max-h-40 overflow-auto rounded-md border bg-action/40 p-3 text-xs leading-relaxed text-primary">
                <code>
                  {format === "URL"
                    ? url
                    : format === "JSON"
                    ? revealKey
                      ? json
                      : json.replace(config.apiKey, "&lt;API_KEY&gt;")
                    : `${config.nodeName}\n${selectedTools.length} selected commands\nEndpoint: ${endpointPath}`}
                </code>
              </pre>
              {format === "JSON" ? (
                <button
                  type="button"
                  className="flex items-center gap-2 self-end text-xs text-muted-foreground hover:text-primary"
                  onClick={() => setRevealKey((value) => !value)}
                >
                  {revealKey ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {revealKey ? "Hide API key" : "Show API key"}
                </button>
              ) : null}
              <CopyButton value={format === "JSON" ? json : url} />
            </DrawerFooter>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
