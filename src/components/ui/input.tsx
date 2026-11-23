// Based on shadcn's v3 input (https://ui.shadcn.com/r/styles/new-york/input.json):
// starter colours, no file: styles, and the same 2px focus outline as the button.
import * as React from "react"

import { cn } from "@/lib/utils"

// Shared with the currency select, so the two fields can't drift apart.
export const fieldClassName =
  "h-9 w-full rounded-md border border-[#6b7280] bg-white px-3 py-1 text-base shadow-sm focus-visible:border-[rgb(61,70,83)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(61,70,83)] focus-visible:ring-[3px] focus-visible:ring-[rgba(59,130,246,0.4)] md:text-sm"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          fieldClassName,
          "flex transition-colors placeholder:text-[#6b7280] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
