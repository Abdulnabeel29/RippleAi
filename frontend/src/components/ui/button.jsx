import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-white/10 border border-white/10 text-white hover:bg-white/[0.18] hover:border-white/20 hover:text-white",
        destructive: "bg-danger/20 border border-danger/30 text-danger hover:bg-danger/30 hover:text-white",
        outline: "border border-white/20 bg-transparent text-white hover:bg-white/10 hover:border-white/30 hover:text-white",
        secondary: "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 hover:text-white",
        ghost: "text-white/60 hover:bg-white/[0.06] hover:text-white",
        link: "text-white/70 underline-offset-4 hover:text-white hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
