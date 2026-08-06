import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";

import { cn } from "../../lib/utils";

type DrawerContextValue = {
  showSwipeHandle: boolean;
  disableGestures: boolean;
};

const DrawerContext = React.createContext<DrawerContextValue>({
  showSwipeHandle: false,
  disableGestures: false,
});

type DrawerProps = React.ComponentProps<typeof DrawerPrimitive.Root> & {
  showSwipeHandle?: boolean;
  disableGestures?: boolean;
};

const Drawer = ({
  showSwipeHandle = false,
  disableGestures = false,
  children,
  ...props
}: DrawerProps) => (
  <DrawerContext.Provider value={{ showSwipeHandle, disableGestures }}>
    <DrawerPrimitive.Root data-slot="drawer" {...props}>
      {children}
    </DrawerPrimitive.Root>
  </DrawerContext.Provider>
);
Drawer.displayName = "Drawer";

type DrawerTriggerProps = React.ComponentProps<
  typeof DrawerPrimitive.Trigger
> & {
  asChild?: boolean;
};

const DrawerTrigger = React.forwardRef<HTMLButtonElement, DrawerTriggerProps>(
  ({ asChild, render, children, nativeButton, ...props }, ref) => {
    const renderedChild =
      asChild && React.isValidElement(children) ? children : null;
    const rendersNativeButton =
      !renderedChild ||
      typeof renderedChild.type !== "string" ||
      renderedChild.type === "button";

    return (
      <DrawerPrimitive.Trigger
        ref={ref}
        data-slot="drawer-trigger"
        nativeButton={nativeButton ?? rendersNativeButton}
        render={renderedChild ?? render}
        {...props}
      >
        {renderedChild ? undefined : children}
      </DrawerPrimitive.Trigger>
    );
  }
);
DrawerTrigger.displayName = "DrawerTrigger";

const DrawerPortal = DrawerPrimitive.Portal;

type DrawerCloseProps = React.ComponentProps<typeof DrawerPrimitive.Close> & {
  asChild?: boolean;
};

const DrawerClose = React.forwardRef<HTMLButtonElement, DrawerCloseProps>(
  ({ asChild, render, children, nativeButton, ...props }, ref) => {
    const renderedChild =
      asChild && React.isValidElement(children) ? children : null;
    const rendersNativeButton =
      !renderedChild ||
      typeof renderedChild.type !== "string" ||
      renderedChild.type === "button";

    return (
      <DrawerPrimitive.Close
        ref={ref}
        data-slot="drawer-close"
        nativeButton={nativeButton ?? rendersNativeButton}
        render={renderedChild ?? render}
        {...props}
      >
        {renderedChild ? undefined : children}
      </DrawerPrimitive.Close>
    );
  }
);
DrawerClose.displayName = "DrawerClose";

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Backdrop>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Backdrop>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Backdrop
    ref={ref}
    data-slot="drawer-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-black/20  opacity-[var(--drawer-overlay-opacity)] transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
      className
    )}
    {...props}
  />
));
DrawerOverlay.displayName = "DrawerOverlay";

const DrawerSwipeHandle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="drawer-swipe-handle"
    className={cn(
      "mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-neutral-600",
      className
    )}
    {...props}
  />
);
DrawerSwipeHandle.displayName = "DrawerSwipeHandle";

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Popup>
>(({ className, children, ...props }, ref) => {
  const { showSwipeHandle, disableGestures } = React.useContext(DrawerContext);

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        className="fixed inset-0 z-50 flex pointer-events-none"
      >
        <DrawerPrimitive.Popup
          ref={ref}
          data-slot="drawer-content"
          data-base-ui-swipe-ignore={disableGestures ? "" : undefined}
          className={cn(
            "group/drawer-popup pointer-events-auto fixed z-50 flex flex-col overflow-hidden border bg-background outline-none transition-transform duration-200 ease-out [--drawer-inset:0px] [--drawer-max-width:24rem] [--drawer-width:75%]",
            "data-[swipe-direction=down]:bottom-[var(--drawer-inset)] data-[swipe-direction=down]:left-[var(--drawer-inset)] data-[swipe-direction=down]:right-[var(--drawer-inset)] data-[swipe-direction=down]:mt-24 data-[swipe-direction=down]:max-h-[calc(100dvh-6rem)] data-[swipe-direction=down]:rounded-t-[10px] data-[swipe-direction=down]:translate-y-[calc(var(--drawer-swipe-movement-y)+var(--drawer-snap-point-offset,0px))] data-[swipe-direction=down]:data-[ending-style]:translate-y-full data-[swipe-direction=down]:data-[starting-style]:translate-y-full",
            "data-[swipe-direction=up]:left-[var(--drawer-inset)] data-[swipe-direction=up]:right-[var(--drawer-inset)] data-[swipe-direction=up]:top-[var(--drawer-inset)] data-[swipe-direction=up]:mb-24 data-[swipe-direction=up]:max-h-[calc(100dvh-6rem)] data-[swipe-direction=up]:rounded-b-[10px] data-[swipe-direction=up]:-translate-y-[calc(var(--drawer-swipe-movement-y)+var(--drawer-snap-point-offset,0px))] data-[swipe-direction=up]:data-[ending-style]:-translate-y-full data-[swipe-direction=up]:data-[starting-style]:-translate-y-full",
            "data-[swipe-direction=right]:bottom-[var(--drawer-inset)] data-[swipe-direction=right]:right-[var(--drawer-inset)] data-[swipe-direction=right]:top-[var(--drawer-inset)] data-[swipe-direction=right]:h-[calc(100dvh-var(--drawer-inset)-var(--drawer-inset))] data-[swipe-direction=right]:w-[var(--drawer-width)] data-[swipe-direction=right]:max-w-[var(--drawer-max-width)] data-[swipe-direction=right]:translate-x-[var(--drawer-swipe-movement-x)] data-[swipe-direction=right]:data-[ending-style]:translate-x-full data-[swipe-direction=right]:data-[starting-style]:translate-x-full",
            "data-[swipe-direction=left]:bottom-[var(--drawer-inset)] data-[swipe-direction=left]:left-[var(--drawer-inset)] data-[swipe-direction=left]:top-[var(--drawer-inset)] data-[swipe-direction=left]:h-[calc(100dvh-var(--drawer-inset)-var(--drawer-inset))] data-[swipe-direction=left]:w-[var(--drawer-width)] data-[swipe-direction=left]:max-w-[var(--drawer-max-width)] data-[swipe-direction=left]:translate-x-[var(--drawer-swipe-movement-x)] data-[swipe-direction=left]:data-[ending-style]:-translate-x-full data-[swipe-direction=left]:data-[starting-style]:-translate-x-full",
            className
          )}
          {...props}
        >
          {showSwipeHandle ? <DrawerSwipeHandle /> : null}
          <DrawerPrimitive.Content
            data-slot="drawer-inner-content"
            data-base-ui-swipe-ignore={disableGestures ? "" : undefined}
            render={<div className="contents" />}
          >
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  );
});
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="drawer-header"
    className={cn(
      "grid gap-1.5 p-4 text-center outline-none sm:text-left",
      className
    )}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="drawer-footer"
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    data-slot="drawer-title"
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    data-slot="drawer-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DrawerDescription.displayName = "DrawerDescription";

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerSwipeHandle,
};
