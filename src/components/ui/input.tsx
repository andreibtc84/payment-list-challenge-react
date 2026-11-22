// Based on shadcn's v3 input (https://ui.shadcn.com/r/styles/new-york/input.json):
// starter colours, no file: styles, and the same 2px focus outline as the button.
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-[#6b7280] bg-white px-3 py-1 text-base shadow-sm transition-colors placeholder:text-[#6b7280] focus-visible:border-[rgb(61,70,83)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(61,70,83)] focus-visible:ring-[3px] focus-visible:ring-[rgba(59,130,246,0.4)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
