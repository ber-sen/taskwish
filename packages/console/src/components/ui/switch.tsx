import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "../../lib/utils";

export type SwitchProps = React.ComponentPropsWithoutRef<
  typeof SwitchPrimitive.Root
> & {
  size?: "default" | "sm";
};

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, size = "default", ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary data-[unchecked]:bg-input",
      size === "sm" ? "h-4 w-7" : "h-5 w-9",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform data-[unchecked]:translate-x-0",
        size === "sm"
          ? "h-3 w-3 data-[checked]:translate-x-3"
          : "h-4 w-4 data-[checked]:translate-x-4"
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export { Switch };
