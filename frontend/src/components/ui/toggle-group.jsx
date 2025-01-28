import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { cn } from "../../lib/utils"
import { toggleVariants } from "./toggle"

const ToggleGroup = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center justify-center gap-1", className)}
    {...props}
  />
))

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef(({ className, children, variant, size, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(toggleVariants({ variant, size }), className)}
    {...props}
  >
    {children}
  </ToggleGroupPrimitive.Item>
))

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem } 