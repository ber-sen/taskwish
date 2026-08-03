import { X } from "lucide-react";

import ActorArtwork from "../console/actor-artwork";
import { Button } from "../ui/button";
import {
  DrawerClose,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import { actionDescription, actionTitle } from "../../lib/command-actions";
import type { CommandCenterAction } from "../../types";

export function ActionDrawerHeader({
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
