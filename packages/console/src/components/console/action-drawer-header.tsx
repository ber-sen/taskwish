import { X } from "lucide-react";

import ActorArtwork from "../console/actor-artwork";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  DrawerClose,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import { actionDescription, actionTitle } from "../../lib/command-actions";
import type { ConsoleAction } from "../../types";

export function ActionDrawerHeader({
  action,
  collapsed,
  showLogs,
  canRun,
  isRunning,
  isFinalized,
  onLogsChange,
  onRun,
  onNewRun,
  onCancel,
}: {
  action: ConsoleAction;
  collapsed: boolean;
  showLogs: boolean;
  canRun: boolean;
  isRunning: boolean;
  isFinalized: boolean;
  onLogsChange: (enabled: boolean) => void;
  onRun: () => void;
  onNewRun: () => void;
  onCancel: () => void;
}) {
  const logsId = `trace-${action.id}`;
  const miniLogsId = `mini-trace-${action.id}`;

  return (
    <DrawerHeader
      className={`sticky top-0 z-10 shrink-0 bg-background text-left transition-all duration-200 mini-app:pt-[100px] ${
        collapsed && "py-2 mini-app:pt-2"
      }`}
    >
      <div className="relative">
        <div className="absolute top-0.5 right-0 hidden items-center gap-2 mini-app:flex">
          {!collapsed ? (
            <div className="flex h-9 items-center gap-2 rounded-full border border-input px-3">
              <Label htmlFor={miniLogsId} className="text-xs">
                Trace
              </Label>
              <Switch
                id={miniLogsId}
                size="sm"
                className="shadow-none"
                thumbClassName="shadow-none"
                checked={showLogs}
                onCheckedChange={onLogsChange}
              />
            </div>
          ) : null}
          {isRunning ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-4"
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : canRun ? (
            <Button
              type="button"
              className="h-9 rounded-full px-4"
              onClick={onRun}
            >
              Run
            </Button>
          ) : isFinalized ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-4"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onNewRun();
              }}
            >
              New run
            </Button>
          ) : null}
        </div>
        <DrawerClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute -right-2 -top-2 h-9 w-9 rounded-full mini-app:hidden"
            aria-label="Close"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerClose>
      </div>
      {!collapsed && (
        <div className="-ml-2 -mt-2 flex items-center gap-3 text-sm font-semibold text-foreground/80">
          <ActorArtwork name={action.actor} />
        </div>
      )}
      <div className="flex gap-3">
        {collapsed && (
          <div className="-ml-2 shrink-0">
            <ActorArtwork name={action.actor} className="h-[50px] w-[50px] shrink-0" />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <DrawerTitle className="truncate">{actionTitle(action)}</DrawerTitle>
          <DrawerDescription className="truncate">
            {collapsed ? action.actor : actionDescription(action)}
          </DrawerDescription>
        </div>
        {!collapsed ? (
          <div className="ml-auto flex h-8 items-center gap-2 mini-app:hidden">
            <Label htmlFor={logsId} className="text-xs">
              Trace
            </Label>
            <Switch
              id={logsId}
              size="sm"
              className="shadow-none"
              thumbClassName="shadow-none"
              checked={showLogs}
              onCheckedChange={onLogsChange}
            />
          </div>
        ) : null}
      </div>
    </DrawerHeader>
  );
}
