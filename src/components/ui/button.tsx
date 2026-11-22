// Shared button: starter colours, a 2px focus outline (the 40% ring alone is under 3:1), and
// aria-disabled support (not-allowed cursor, no hover change; the form handler ignores the click).
import * as React from "react"

import { cn } from "@/lib/utils"

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[rgb(61,108,209)] px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-[rgb(33,65,154)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(61,70,83)] focus-visible:ring-[3px] focus-visible:ring-[rgba(59,130,246,0.4)] disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-[rgb(61,108,209)]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
