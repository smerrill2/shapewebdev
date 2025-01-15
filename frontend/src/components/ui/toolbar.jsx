import * as React from "react"
import * as ToolbarPrimitive from "@radix-ui/react-toolbar"
import { cn } from "../../lib/utils"
import { toggleVariants } from "./toggle"

const Toolbar = React.forwardRef(({ className, ...props }, ref) => (
  <ToolbarPrimitive.Root
    ref={ref}
    className={cn(
      "flex h-10 items-center space-x-1 rounded-md border bg-background p-1",
      className
    )}
    {...props}
  />
))
Toolbar.displayName = ToolbarPrimitive.Root.displayName

const ToolbarToggleGroup = React.forwardRef(({ className, ...props }, ref) => (
  <ToolbarPrimitive.ToggleGroup
    ref={ref}
    className={cn("flex space-x-1", className)}
    {...props}
  />
))
ToolbarToggleGroup.displayName = ToolbarPrimitive.ToggleGroup.displayName

const ToolbarToggleItem = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <ToolbarPrimitive.ToggleItem
    ref={ref}
    className={cn(toggleVariants({ variant, size }), className)}
    {...props}
  />
))
ToolbarToggleItem.displayName = ToolbarPrimitive.ToggleItem.displayName

const ToolbarSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <ToolbarPrimitive.Separator
    ref={ref}
    className={cn("-mx-0.5 h-full w-px bg-border", className)}
    {...props}
  />
))
ToolbarSeparator.displayName = ToolbarPrimitive.Separator.displayName

const ToolbarButton = React.forwardRef(({ className, ...props }, ref) => (
  <ToolbarPrimitive.Button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-sm px-2.5 py-1.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
ToolbarButton.displayName = ToolbarPrimitive.Button.displayName

const ToolbarLink = React.forwardRef(({ className, ...props }, ref) => (
  <ToolbarPrimitive.Link
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-sm px-2.5 py-1.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground",
      className
    )}
    {...props}
  />
))
ToolbarLink.displayName = ToolbarPrimitive.Link.displayName

export {
  Toolbar,
  ToolbarToggleGroup,
  ToolbarToggleItem,
  ToolbarSeparator,
  ToolbarButton,
  ToolbarLink,
} 