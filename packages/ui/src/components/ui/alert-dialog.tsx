"use client";

import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  );
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        "data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/80 duration-100 data-closed:animate-out data-open:animate-in supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      data-slot="alert-dialog-overlay"
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: "default" | "sm";
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          "group/alert-dialog-content data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-3 rounded-xl bg-popover p-4 text-popover-foreground outline-none ring-1 ring-foreground/10 duration-100 data-[size=default]:max-w-xs data-[size=sm]:max-w-64 data-closed:animate-out data-open:animate-in data-[size=default]:sm:max-w-sm",
          className
        )}
        data-size={size}
        data-slot="alert-dialog-content"
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid place-items-center gap-1 text-center sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left",
        className
      )}
      data-slot="alert-dialog-header"
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      data-slot="alert-dialog-footer"
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("font-heading font-medium text-sm", className)}
      data-slot="alert-dialog-title"
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn(
        "text-muted-foreground text-xs/relaxed *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      data-slot="alert-dialog-description"
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <Button asChild size={size} variant={variant}>
      <AlertDialogPrimitive.Action
        className={cn(className)}
        data-slot="alert-dialog-action"
        {...props}
      />
    </Button>
  );
}

function AlertDialogCancel({
  className,
  size = "default",
  variant = "outline",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <Button asChild size={size} variant={variant}>
      <AlertDialogPrimitive.Cancel
        className={cn(className)}
        data-slot="alert-dialog-cancel"
        {...props}
      />
    </Button>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
