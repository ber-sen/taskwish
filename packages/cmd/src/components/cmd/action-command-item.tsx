import { Command as CommandPrimitive } from "cmdk";
import { Copy, Play } from "lucide-react";

import ActorArtwork from "../console/actor-artwork";
import { cn } from "../../lib/utils";
import {
  actionDescription,
  actionTitle,
  getActionValue,
} from "../../lib/command-actions";
import type { CommandCenterAction } from "../../types";

function ActionIcon({ action }: { action: CommandCenterAction }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black bg-black text-white"
    >
      {action.source === "http" ? (
        <Copy className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4 fill-current" />
      )}
    </span>
  );
}

export function ActionCommandItem({
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
