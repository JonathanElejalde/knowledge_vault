import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: "left" | "right" | "top" | "bottom"
}

const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ className, side = "left", children, ...rest }, ref) => {
    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 transition-opacity" />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed z-50 bg-background p-6 shadow-lg transition-transform duration-300",
            side === "left" && "inset-y-0 left-0 w-64 translate-x-0",
            side === "right" && "inset-y-0 right-0 w-64 translate-x-0",
            side === "top" && "inset-x-0 top-0 h-1/3 translate-y-0",
            side === "bottom" && "inset-x-0 bottom-0 h-1/3 translate-y-0",
            className
          )}
          {...rest}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    )
  }
)
SheetContent.displayName = "SheetContent"

export { Sheet, SheetTrigger, SheetContent } 